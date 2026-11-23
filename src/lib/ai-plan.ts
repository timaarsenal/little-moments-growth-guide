import { z } from "zod";

import { pickFromLibrary } from "./library";
import { MAX_ACTIVITY, MIN_ACTIVITY, type Slot } from "./schedule";
import { CATEGORIES, type Category, type DayPlan, type LogLite, type PlanItem } from "./types";

/** Strict JSON schema the model must follow: one activity per slot, text in both RU and KZ. */
const textSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "why", "steps", "materials"],
  properties: {
    title: { type: "string" },
    why: { type: "string" },
    steps: { type: "array", items: { type: "string" } },
    materials: { type: "array", items: { type: "string" } },
  },
} as const;

export const AI_PLAN_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["activities"],
  properties: {
    activities: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["slot", "category", "duration_min", "ru", "kz"],
        properties: {
          slot: { type: "integer" },
          category: { type: "string", enum: [...CATEGORIES] },
          duration_min: { type: "integer" },
          ru: textSchema,
          kz: textSchema,
        },
      },
    },
  },
};

const text = z.object({
  title: z.string().trim().min(2).max(90),
  why: z.string().trim().min(5).max(300),
  steps: z.array(z.string().trim().min(2).max(300)).min(1).max(8),
  materials: z.array(z.string().trim().min(1).max(80)).max(8),
});

const aiResponse = z.object({
  activities: z.array(
    z.object({
      slot: z.number().int(),
      category: z.enum(CATEGORIES),
      duration_min: z.number(),
      ru: text,
      kz: text,
    }),
  ),
});

export interface HistorySummary {
  byCategory: Record<Category, { done: number; skipped: number; liked: number; disliked: number }>;
  liked: string[];
  disliked: string[];
  recent: string[];
}

/** Compact view of past marks for the prompt: per-category counts plus titles the child liked or disliked. */
export function summarizeHistory(history: LogLite[]): HistorySummary {
  const byCategory = Object.fromEntries(
    CATEGORIES.map((c) => [c, { done: 0, skipped: 0, liked: 0, disliked: 0 }]),
  ) as HistorySummary["byCategory"];
  const liked = new Set<string>();
  const disliked = new Set<string>();
  const recent = new Set<string>();
  for (const log of history) {
    const stats = byCategory[log.category as Category];
    if (!stats) continue;
    if (log.status === "done") stats.done += 1;
    else stats.skipped += 1;
    if (log.reaction === "liked") {
      stats.liked += 1;
      liked.add(log.title);
    } else if (log.reaction === "disliked") {
      stats.disliked += 1;
      disliked.add(log.title);
    }
    if (recent.size < 12) recent.add(log.title);
  }
  return {
    byCategory,
    liked: [...liked].slice(0, 10),
    disliked: [...disliked].slice(0, 10),
    recent: [...recent],
  };
}

export const AI_INSTRUCTIONS = `You are a child-development specialist who plans short play activities for busy parents of toddlers aged 1–3.
Plan exactly one activity for every slot you receive.
Rules:
- Fit the child's age in months exactly: realistic, safe and engaging for that age.
- duration_min must be between ${MIN_ACTIVITY} and ${MAX_ACTIVITY} and must not exceed the slot's max_minutes.
- Use a different category for every activity when there are 5 or fewer slots. Categories: speech, gross_motor (movement or a walk), fine_motor, creative_sensory, emotions_social.
- Prefer categories and kinds of activities the child liked; avoid what the child disliked or parents often skipped, but keep variety. Do not repeat recent activities word for word.
- Morning slots: calm or energising activities at home. Evening slots: calm, before-bed friendly activities (no running right before sleep). Weekend slots: may include an outdoor walk.
- Safety: an adult always supervises; no small objects that a child under 3 could choke on (no beads, buttons, coins, uncooked beans, small balloons); no screens; no food the child could choke on; no medical advice.
- Materials: common household items only; use an empty list when nothing is needed.
- why: one short sentence on what skill it develops. steps: 3–5 short, concrete steps for the parent.
- Write every text twice: "ru" in natural Russian and "kz" in natural Kazakh (Cyrillic). Same activity, same meaning in both.`;

/** User message with everything the model needs. The child's name is never sent. */
export function buildAiInput(ageMonths: number, slots: Slot[], history: LogLite[], weekend: boolean): string {
  return JSON.stringify({
    child_age_months: ageMonths,
    day: weekend ? "weekend" : "weekday",
    slots: slots.map((s) => ({
      slot: s.index,
      window: s.window,
      start_time: s.start_time,
      max_minutes: s.max_minutes,
    })),
    past_30_days: summarizeHistory(history),
  });
}

/**
 * Validate the model's JSON against the slots. Returns valid items keyed by slot (duration clamped to the slot,
 * repeated categories and unknown slots dropped), or null when the payload is unusable.
 */
export function parseAiPlan(raw: string, slots: Slot[], today: string): Map<number, PlanItem> | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = aiResponse.safeParse(json);
  if (!parsed.success) return null;

  const bySlot = new Map(slots.map((s) => [s.index, s]));
  const usedCats = new Set<Category>();
  const out = new Map<number, PlanItem>();
  for (const a of parsed.data.activities) {
    const slot = bySlot.get(a.slot);
    if (!slot || out.has(slot.index)) continue;
    if (slots.length <= CATEGORIES.length && usedCats.has(a.category)) continue;
    usedCats.add(a.category);
    const duration = Math.round(Math.min(slot.max_minutes, MAX_ACTIVITY, Math.max(MIN_ACTIVITY, a.duration_min)));
    out.set(slot.index, {
      key: `ai:${today}:${slot.index}`,
      category: a.category,
      duration_min: duration,
      window: slot.window,
      start_time: slot.start_time,
      ru: a.ru,
      kz: a.kz,
    });
  }
  return out.size ? out : null;
}

/** Day plan from AI items, with any slot the AI missed filled from the built-in library. */
export function mergeWithLibrary(
  slots: Slot[],
  aiItems: Map<number, PlanItem> | null,
  history: LogLite[],
  seed: string,
): DayPlan {
  if (!aiItems || aiItems.size === 0) {
    return { source: "library", items: pickFromLibrary(slots, history, seed) };
  }
  const missing = slots.filter((s) => !aiItems.has(s.index));
  const taken = [...aiItems.values()].map((i) => i.category);
  const fill = pickFromLibrary(missing, history, seed, taken);
  const fillBySlot = new Map(missing.map((s, i) => [s.index, fill[i]]));
  const items = slots.flatMap((s) => {
    const item = aiItems.get(s.index) ?? fillBySlot.get(s.index);
    return item ? [item] : [];
  });
  return { source: "ai", items };
}

const planItem = z.object({
  key: z.string(),
  category: z.enum(CATEGORIES),
  duration_min: z.number(),
  window: z.enum(["morning", "evening", "weekend"]),
  start_time: z.string(),
  ru: text,
  kz: text,
});

/** Read a stored plan back from the database; null when it doesn't match the current shape. */
export function readStoredPlan(source: string, activities: unknown): DayPlan | null {
  const parsed = z.array(planItem).safeParse(activities);
  if (!parsed.success || parsed.data.length === 0) return null;
  return { source: source === "ai" ? "ai" : "library", items: parsed.data };
}

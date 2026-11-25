import { z } from "zod";

import { pickFromLibrary } from "./library";
import { MAX_ACTIVITY, MIN_ACTIVITY, type Slot } from "./schedule";
import { CATEGORIES, INTEREST_TAGS, type Category, type DayPlan, type LogLite, type PlanItem } from "./types";

const INTEREST_VALUES = [...INTEREST_TAGS, "custom"] as const;

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
        required: ["slot", "category", "duration_min", "outdoor", "is_kazakh", "kazakh_words", "interests", "ru", "kz"],
        properties: {
          slot: { type: "integer" },
          category: { type: "string", enum: [...CATEGORIES] },
          duration_min: { type: "integer" },
          outdoor: { type: "boolean" },
          is_kazakh: { type: "boolean" },
          kazakh_words: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["kz", "ru"],
              properties: { kz: { type: "string" }, ru: { type: "string" } },
            },
          },
          interests: { type: "array", items: { type: "string", enum: [...INTEREST_VALUES] } },
          ru: textSchema,
          kz: textSchema,
        },
      },
    },
  },
};

const text = z.object({
  title: z.string().trim().min(2).max(160),
  why: z.string().trim().min(5).max(600),
  steps: z.array(z.string().trim().min(2).max(600)).min(1).max(10),
  materials: z.array(z.string().trim().min(1).max(160)).max(12),
});

const aiActivity = z.object({
      slot: z.number().int(),
      category: z.enum(CATEGORIES),
      duration_min: z.number(),
      outdoor: z.boolean().default(false),
      is_kazakh: z.boolean().default(false),
      kazakh_words: z.array(z.object({ kz: z.string().trim().min(1).max(80), ru: z.string().trim().min(1).max(80) })).max(10).default([]),
      interests: z.array(z.enum(INTEREST_VALUES)).max(9).default([]),
      ru: text,
      kz: text,
});
/** Each activity is validated on its own, so one odd item never throws away the whole AI plan. */
const aiResponse = z.object({ activities: z.array(z.unknown()) });

/** Child preferences the planner must honour. */
export interface PlanPrefs {
  interests: string[];
  customInterest: string;
  bilingual: boolean;
  weather: string | null;
}
export const NO_PREFS: PlanPrefs = { interests: [], customInterest: "", bilingual: false, weather: null };
/** A bilingual family gets at most this many Kazakh activities a day. */
export const MAX_KAZAKH = 2;

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
- Slots with calm_only=true are within 30 minutes of a nap or bedtime: plan ONLY a calm, quiet activity there (books, quiet speech games, gentle touch, quiet fine-motor play) — never gross_motor, running, jumping or outdoor.
- Morning slots: calm or energising activities at home. Evening slots: calm, before-bed friendly activities (no running right before sleep). Weekend slots: may include an outdoor walk.
- Safety: an adult always supervises; no small objects that a child under 3 could choke on (no beads, buttons, coins, uncooked beans, small balloons); no screens; no food the child could choke on; no medical advice.
- Materials: common household items only; use an empty list when nothing is needed.
- why: one short sentence on what skill it develops. steps: 3–5 short, concrete steps for the parent.
- Interests: when the child has interests, build EVERY activity you can around them (e.g. count toy cars, sort animals by size, sing about the ball) and list the interests you used in "interests" ("custom" for the parent's own text). Use an empty list only when no interest fits.
- Bilingual: when bilingual is true, make 1–2 activities (never more) Kazakh-language activities (is_kazakh=true): new Kazakh words on the day's theme, a short тақпақ, or a Kazakh folk game (e.g. «Ақ серек, көк серек», «Соқыр теке», «Орамал тастау»). List 2–5 taught words in kazakh_words with a Russian translation. In the "ru" text write each Kazakh word with its translation in brackets, e.g. «алма (яблоко)». In the "kz" text keep the Kazakh words as they are. Otherwise is_kazakh=false and kazakh_words=[].
- outdoor=true only for activities that happen outside (walks, playground). When weather_today says play must stay home, plan NO outdoor activities.
- Write every text twice: "ru" in natural Russian and "kz" in natural Kazakh (Cyrillic). Same activity, same meaning in both.`;

/** User message with everything the model needs. The child's name is never sent. */
export function buildAiInput(ageMonths: number, slots: Slot[], history: LogLite[], weekend: boolean, prefs: PlanPrefs = NO_PREFS): string {
  return JSON.stringify({
    child_age_months: ageMonths,
    child_interests: prefs.interests,
    child_interests_custom: prefs.customInterest || null,
    bilingual: prefs.bilingual,
    weather_today: prefs.weather ?? "fine for a walk",
    day: weekend ? "weekend" : "weekday",
    slots: slots.map((s) => ({
      slot: s.index,
      window: s.window,
      start_time: s.start_time,
      max_minutes: s.max_minutes,
      calm_only: s.calm,
    })),
    past_30_days: summarizeHistory(history),
  });
}

/**
 * Validate the model's JSON against the slots. Returns valid items keyed by slot (duration clamped to the slot,
 * repeated categories and unknown slots dropped), or null when the payload is unusable.
 */
export function parseAiPlan(raw: string, slots: Slot[], today: string, prefs: PlanPrefs = NO_PREFS): Map<number, PlanItem> | null {
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
  const allowed = new Set<string>([...prefs.interests, ...(prefs.customInterest ? ["custom"] : [])]);
  let kazakhCount = 0;
  for (const rawItem of parsed.data.activities) {
    const one = aiActivity.safeParse(rawItem);
    if (!one.success) continue;
    const a = one.data;
    const slot = bySlot.get(a.slot);
    if (!slot || out.has(slot.index)) continue;
    // Never an active game right before sleep; the library fills this slot with a calm one instead.
    if (slot.calm && (a.category === "gross_motor" || a.outdoor)) continue;
    if (slots.length <= CATEGORIES.length && usedCats.has(a.category)) continue;
    usedCats.add(a.category);
    const duration = Math.round(Math.min(slot.max_minutes, MAX_ACTIVITY, Math.max(MIN_ACTIVITY, a.duration_min)));
    const item: PlanItem = {
      key: `ai:${today}:${slot.index}`,
      category: a.category,
      duration_min: duration,
      window: slot.window,
      start_time: slot.start_time,
      ru: a.ru,
      kz: a.kz,
    };
    if (a.outdoor) item.outdoor = true;
    if (prefs.bilingual && a.is_kazakh && kazakhCount < MAX_KAZAKH) {
      kazakhCount += 1;
      item.kazakh = true;
      if (a.kazakh_words.length) item.kz_words = a.kazakh_words;
    }
    const used = [...new Set(a.interests.filter((i) => allowed.has(i)))];
    if (used.length) item.interests = used;
    out.set(slot.index, item);
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
  outdoor: z.boolean().optional(),
  kazakh: z.boolean().optional(),
  kz_words: z.array(z.object({ kz: z.string(), ru: z.string() })).optional(),
  interests: z.array(z.string()).optional(),
  ru: text,
  kz: text,
});

/** Read a stored plan back from the database; null when it doesn't match the current shape. */
export function readStoredPlan(source: string, activities: unknown): DayPlan | null {
  const parsed = z.array(planItem).safeParse(activities);
  if (!parsed.success || parsed.data.length === 0) return null;
  const items: PlanItem[] = parsed.data.map(({ outdoor, kazakh, kz_words, interests, ...rest }) => ({
    ...rest,
    ...(outdoor ? { outdoor } : {}),
    ...(kazakh ? { kazakh } : {}),
    ...(kz_words?.length ? { kz_words } : {}),
    ...(interests?.length ? { interests } : {}),
  }));
  return { source: source === "ai" ? "ai" : "library", items };
}

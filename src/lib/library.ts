import raw from "@/data/activities.json";

import type { Slot } from "./schedule";
import { isCategory, type Category, type LocalizedText, type LogLite, type PlanItem, type PlannedActivity } from "./types";

export interface LibraryActivity {
  id: string;
  category: Category;
  duration_min: number;
  age_min_months: number;
  age_max_months: number;
  ru: LocalizedText;
  kz: LocalizedText;
  outdoor?: boolean;
}

export const LIBRARY: LibraryActivity[] = raw.flatMap((a) =>
  isCategory(a.category) ? [{ ...a, category: a.category }] : [],
);

export const libraryKey = (id: string) => `lib:${id}`;

/** Deterministic 0..1 value so the same day shows the same plan. */
function jitter(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

const REACTION_WEIGHT: Record<string, number> = { liked: 2, ok: 0.5, disliked: -2 };

/**
 * Fill each slot with one library activity: categories differ when possible, duration fits the slot,
 * categories and activities the child liked rank higher, disliked ones lower.
 * `history` must exclude today's marks so the plan stays stable during the day.
 * `takenCategories` are already used by other cards of the day (e.g. AI ones) and are avoided when possible.
 */
export function pickFromLibrary(
  slots: Slot[],
  history: LogLite[],
  seed: string,
  takenCategories: Category[] = [],
): PlanItem[] {
  const catScore = new Map<string, number>();
  const idScore = new Map<string, number>();
  for (const log of history) {
    const w = log.status === "done" ? (REACTION_WEIGHT[log.reaction ?? ""] ?? 0) : -0.5;
    catScore.set(log.category, (catScore.get(log.category) ?? 0) + w);
    const idW = log.reaction === "disliked" ? -4 : log.reaction === "liked" ? 1.5 : -1;
    idScore.set(log.activity_key, (idScore.get(log.activity_key) ?? 0) + idW);
  }

  const usedIds = new Set<string>();
  const usedCats = new Set<Category>(takenCategories);
  const result: PlanItem[] = [];

  for (const slot of slots) {
    // Right before sleep: only calm activities (no movement games, no walks).
    const unused = LIBRARY.filter((a) => !usedIds.has(a.id) && !(slot.calm && (a.category === "gross_motor" || a.outdoor)));
    const freshCats = unused.filter((a) => !usedCats.has(a.category));
    const pool = freshCats.length ? freshCats : unused;
    const fitting = pool.filter((a) => a.duration_min <= slot.max_minutes);
    const candidates = fitting.length ? fitting : pool;

    let best: LibraryActivity | undefined;
    let bestScore = -Infinity;
    for (const a of candidates) {
      let score =
        (catScore.get(a.category) ?? 0) +
        (idScore.get(libraryKey(a.id)) ?? 0) +
        jitter(`${seed}:${slot.index}:${a.id}`) * 1.5;
      if (!fitting.length) score -= a.duration_min / 10;
      if (score > bestScore) {
        bestScore = score;
        best = a;
      }
    }
    if (!best) continue;

    usedIds.add(best.id);
    usedCats.add(best.category);
    result.push({
      key: libraryKey(best.id),
      category: best.category,
      duration_min: Math.min(best.duration_min, slot.max_minutes),
      window: slot.window,
      start_time: slot.start_time,
      ...(best.outdoor ? { outdoor: true } : {}),
      ru: best.ru,
      kz: best.kz,
    });
  }

  return result;
}

import quickRaw from "@/data/quick-activities.json";

export interface QuickActivity extends LibraryActivity {
  place: string;
  supervised?: boolean;
}

export const QUICK_LIBRARY: QuickActivity[] = quickRaw.flatMap((a) =>
  isCategory(a.category) ? [{ ...a, category: a.category }] : [],
);

/** Grains, small objects and water need an adult watching. */
const SUPERVISION_WORDS = ["круп", "греч", "рис", "фасол", "горох", "макарон", "бусин", "пуговиц", "мелк", "вод", "ванн", "бассейн"];
export function needsSupervision(text: LocalizedText): boolean {
  const all = [text.title, ...text.steps, ...text.materials].join(" ").toLowerCase();
  return SUPERVISION_WORDS.some((w) => all.includes(w));
}

/** Up to 4 activities of 2–5 minutes, made strictly for this place and the child's age. */
export function quickIdeas(place: string, months: number): QuickActivity[] {
  return QUICK_LIBRARY.filter((a) => a.place === place && months >= a.age_min_months && months <= a.age_max_months)
    .sort((a, b) => a.duration_min - b.duration_min)
    .slice(0, 4);
}

export function quickToPlanned(a: QuickActivity, lang: "ru" | "kz"): PlannedActivity {
  const text = a[lang];
  return {
    key: `quick:${a.id}`,
    category: a.category,
    duration_min: a.duration_min,
    window: "morning",
    start_time: "",
    title: text.title,
    why: text.why,
    steps: text.steps,
    materials: text.materials,
    ...(a.supervised || needsSupervision(a.ru) ? { supervised: true } : {}),
  };
}

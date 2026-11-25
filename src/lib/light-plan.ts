import type { Category, PlanItem } from "./types";

/** On a "very tired" day the plan keeps 2 activities (1 when the day has 3 or fewer)… */
export const LIGHT_MAX_ITEMS = 2;
/** …each shortened to at most this many minutes. */
export const LIGHT_MAX_MINUTES = 10;

/** Calm categories first; an active walk is the last choice on a tired day. */
const CALM_ORDER: Category[] = ["emotions_social", "speech", "fine_motor", "creative_sensory", "gross_motor"];

/** The 1–2 easiest activities of the day (shortest and calmest), kept in their time order. */
export function lightenPlan(items: PlanItem[]): PlanItem[] {
  const ranked = [...items].sort(
    (a, b) => a.duration_min - b.duration_min || CALM_ORDER.indexOf(a.category) - CALM_ORDER.indexOf(b.category),
  );
  const max = items.length <= 3 ? 1 : LIGHT_MAX_ITEMS;
  const keep = new Set(ranked.slice(0, max).map((i) => i.key));
  return items
    .filter((i) => keep.has(i.key))
    .map((i) => ({ ...i, duration_min: Math.min(i.duration_min, LIGHT_MAX_MINUTES) }));
}

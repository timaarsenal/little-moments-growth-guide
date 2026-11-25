import raw from "@/data/infant-activities.json";

import { sleepStarts, toMinutes, type ScheduleInput } from "./schedule";
import { isCategory, type Category, type LocalizedText } from "./types";

export const INFANT_MAX_MONTHS = 4;

export interface InfantActivity {
  id: string;
  category: Category;
  duration_min: number;
  calm: boolean;
  ru: LocalizedText;
  kz: LocalizedText;
}

export const INFANT_ACTIVITIES: InfantActivity[] = raw.flatMap((a) => (isCategory(a.category) ? [{ ...a, category: a.category }] : []));

/**
 * "Baby woke up": 1–2 activities of 3–10 min for the current awake window.
 * Within 30 min of the next sleep only calm ones; no time left → nothing.
 */
export function suggestForWakeWindow(p: ScheduleInput, nowMinutes: number, seed: number) {
  const next = sleepStarts(p).find((s) => s > nowMinutes) ?? toMinutes(p.bed_time);
  const left = Math.max(0, next - nowMinutes);
  if (left < 3) return { left, items: [] as InfantActivity[] };
  const calmOnly = left <= 30;
  const pool = INFANT_ACTIVITIES.filter((a) => a.duration_min <= Math.min(10, left) && (!calmOnly || a.calm));
  const count = left >= 20 ? 2 : 1;
  const items: InfantActivity[] = [];
  for (let i = 0; i < pool.length && items.length < count; i++) {
    const a = pool[(seed + i) % pool.length];
    if (a && !items.some((x) => x.category === a.category)) items.push(a);
  }
  return { left, items };
}

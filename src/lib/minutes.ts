import { shiftISO } from "./age";

export interface DoneLog { plan_date: string; status: string; duration_min: number }
export interface RitualCheck { check_date: string; minutes: number }

/** "Minutes together" for one day: done activities plus checked rituals. Skipped activities don't count. */
export function dayMinutes(logs: DoneLog[], rituals: RitualCheck[], day: string): number {
  return (
    logs.filter((l) => l.plan_date === day && l.status === "done").reduce((s, l) => s + l.duration_min, 0) +
    rituals.filter((r) => r.check_date === day).reduce((s, r) => s + r.minutes, 0)
  );
}

/** Totals for rolling 7-day blocks; index 0 is the last 7 days including today. */
export function weekTotals(logs: DoneLog[], rituals: RitualCheck[], today: string, weeks: number): number[] {
  return Array.from({ length: weeks }, (_, w) => {
    let sum = 0;
    for (let d = 0; d < 7; d++) sum += dayMinutes(logs, rituals, shiftISO(today, -(w * 7 + d)));
    return sum;
  });
}

/** Days in a row with at least one done activity or ritual, ending today (or yesterday if today is still empty). */
export function streakDays(logs: DoneLog[], rituals: RitualCheck[], today: string): number {
  const active = (day: string) => dayMinutes(logs, rituals, day) > 0;
  let day = active(today) ? today : shiftISO(today, -1);
  let n = 0;
  while (active(day)) {
    n += 1;
    day = shiftISO(day, -1);
  }
  return n;
}

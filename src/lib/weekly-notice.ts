/** Weekly reminder: age band + ISO-week rotation, so text changes every week and fits the age. */
export type AgeBand = "infant" | "baby" | "toddler" | "preschool";
export const TIPS_PER_BAND = 6;

export function ageBand(months: number): AgeBand {
  if (months < 6) return "infant";
  if (months < 12) return "baby";
  if (months < 24) return "toddler";
  return "preschool";
}

/** Week number since epoch (Monday-based), stable within a week. */
export function weekIndex(d: Date): number {
  const days = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
  return Math.floor((days + 3) / 7); // 1970-01-01 is Thursday → shift to Monday
}

export function weeklyNoticeKey(months: number, d: Date): string {
  return `weekly.${ageBand(months)}.${weekIndex(d) % TIPS_PER_BAND}`;
}

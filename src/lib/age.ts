/** Full months between a birth date and a day, both "YYYY-MM-DD". */
export function ageInMonths(birthISO: string, todayISO: string): number {
  const [by, bm, bd] = birthISO.split("-").map(Number);
  const [ty, tm, td] = todayISO.split("-").map(Number);
  if (!by || !bm || !bd || !ty || !tm || !td) return 0;
  let months = (ty - by) * 12 + (tm - bm);
  if (td < bd) months -= 1;
  return Math.max(0, months);
}

/** Today's date in the user's local time zone as "YYYY-MM-DD". Call only in the browser. */
export function localTodayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** "07:00:00" -> "07:00" */
export function hhmm(time: string): string {
  return time.slice(0, 5);
}

/** Shift a "YYYY-MM-DD" date by whole days. */
export function shiftISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

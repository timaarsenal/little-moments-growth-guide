export interface Nap { start: string; end: string }

export const MAX_NAPS = 8;

const toMin = (t: string) => {
  const [h, m] = t.split(":");
  return Number(h) * 60 + Number(m);
};
const fromMin = (n: number) => `${String(Math.floor(n / 60) % 24).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
const isTime = (v: unknown): v is string => typeof v === "string" && /^\d{2}:\d{2}/.test(v);

/** Naps stored as JSON → valid, sorted list (at most 8, end after start). */
export function parseNaps(raw: unknown): Nap[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .flatMap((n): Nap[] => {
      if (!n || typeof n !== "object") return [];
      const { start, end } = n as Record<string, unknown>;
      if (!isTime(start) || !isTime(end)) return [];
      const s = start.slice(0, 5);
      const e = end.slice(0, 5);
      return toMin(e) > toMin(s) ? [{ start: s, end: e }] : [];
    })
    .sort((a, b) => toMin(a.start) - toMin(b.start))
    .slice(0, MAX_NAPS);
}

/** Usual number of daytime naps by age: [min, max]. */
export function napRange(months: number): [number, number] {
  if (months < 3) return [5, 8];
  if (months < 6) return [3, 4];
  if (months < 12) return [2, 3];
  if (months < 18) return [2, 2];
  if (months < 36) return [1, 1];
  return [0, 1];
}

function napLength(months: number): number {
  if (months < 3) return 45;
  if (months < 6) return 60;
  if (months < 12) return 75;
  if (months < 18) return 90;
  if (months < 36) return 120;
  return 90;
}

/** Suggested naps for the age, spread evenly between wake-up and bedtime (rounded to 5 min). */
export function defaultNaps(months: number, wake: string, bed: string): Nap[] {
  const [lo] = napRange(months);
  const count = months >= 36 ? 1 : lo;
  const len = napLength(months);
  const day = toMin(bed) - toMin(wake);
  const gap = (day - count * len) / (count + 1);
  if (count === 0 || gap < 20) return [];
  const r5 = (n: number) => Math.round(n / 5) * 5;
  return Array.from({ length: count }, (_, i) => {
    const s = r5(toMin(wake) + gap * (i + 1) + len * i);
    return { start: fromMin(s), end: fromMin(s + len) };
  });
}

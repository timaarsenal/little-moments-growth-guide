import { parseNaps } from "./sleep";
import type { WindowKind } from "./types";

export interface ScheduleInput {
  wake_time: string;
  /** Daytime naps as stored ([{ start, end }]); parsed with parseNaps. */
  naps: unknown;
  bed_time: string;
  morning_minutes: number;
  evening_minutes: number;
  weekend_minutes: number;
}

export interface Slot {
  index: number;
  window: WindowKind;
  /** "HH:MM" local start time */
  start_time: string;
  /** Activity length budget for this slot, 5–30 minutes */
  max_minutes: number;
  /** Ends within 30 minutes of a nap or bedtime: calm activities only. */
  calm: boolean;
}

interface FreeWindow {
  kind: WindowKind;
  start: number;
  minutes: number;
}

export const MIN_ACTIVITY = 5;
export const MAX_ACTIVITY = 30;

export function toMinutes(time: string): number {
  const [h, m] = time.split(":");
  return Number(h) * 60 + Number(m);
}

export function fromMinutes(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function isWeekendDate(iso: string): boolean {
  const [y, m, d] = iso.split("-").map(Number);
  const day = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).getUTCDay();
  return day === 0 || day === 6;
}

/** Sleep periods of the day (naps inside wake..bed, then bedtime) as [start, end] minutes. */
export function sleepStarts(p: ScheduleInput): number[] {
  const wake = toMinutes(p.wake_time);
  const bed = toMinutes(p.bed_time);
  return [...parseNaps(p.naps).map((n) => toMinutes(n.start)).filter((s) => s > wake && s < bed), bed];
}

/** Awake stretches between wake-up, naps and bedtime. */
function awakeSegments(p: ScheduleInput): { start: number; end: number }[] {
  const wake = toMinutes(p.wake_time);
  const bed = toMinutes(p.bed_time);
  const naps = parseNaps(p.naps)
    .map((n) => ({ s: toMinutes(n.start), e: toMinutes(n.end) }))
    .filter((n) => n.s > wake && n.e < bed);
  const out: { start: number; end: number }[] = [];
  let cur = wake;
  for (const n of naps) {
    if (n.s > cur) out.push({ start: cur, end: n.s });
    cur = Math.max(cur, n.e);
  }
  out.push({ start: cur, end: bed });
  return out;
}

/**
 * Parent's free windows for a day, placed so they never touch any nap:
 * morning ends 15 min before the first sleep, weekend window uses the longest later awake stretch,
 * evening ends 15 min before bedtime.
 */
export function buildWindows(p: ScheduleInput, weekend: boolean): FreeWindow[] {
  const wake = toMinutes(p.wake_time);
  const bed = toMinutes(p.bed_time);
  const segs = awakeSegments(p);
  const first = segs[0] ?? { start: wake, end: bed };
  const last = segs[segs.length - 1] ?? first;
  const out: FreeWindow[] = [];

  const morningStart = wake + 30;
  const morningMinutes = Math.min(p.morning_minutes, first.end - 15 - morningStart);
  let busyUntil = morningStart;
  if (morningMinutes >= MIN_ACTIVITY) {
    out.push({ kind: "morning", start: morningStart, minutes: morningMinutes });
    busyUntil = morningStart + morningMinutes;
  }

  if (weekend) {
    const later = segs.length > 1 ? segs.slice(1) : segs;
    const seg = [...later].sort((a, b) => b.end - b.start - (a.end - a.start))[0];
    if (seg) {
      const start = Math.max(seg.start + 30, busyUntil + 60);
      const minutes = Math.min(p.weekend_minutes, seg.end - (seg.end === bed ? 60 : 15) - start);
      if (minutes >= MIN_ACTIVITY) {
        out.push({ kind: "weekend", start, minutes });
        busyUntil = start + minutes;
      }
    }
  }

  const eveningStart = Math.max(bed - 45 - p.evening_minutes, last.start + 30, busyUntil + 30);
  const eveningMinutes = Math.min(p.evening_minutes, bed - 15 - eveningStart);
  if (eveningMinutes >= MIN_ACTIVITY) {
    out.push({ kind: "evening", start: eveningStart, minutes: eveningMinutes });
  }

  return out;
}

/** 3–4 activity slots (fewer only when free time is too short), spread across free windows. */
export function planSlots(p: ScheduleInput, weekend: boolean): Slot[] {
  const windows = buildWindows(p, weekend);
  if (windows.length === 0) return [];

  const total = windows.reduce((sum, w) => sum + w.minutes, 0);
  const target = total >= 40 ? 4 : 3;
  const perWindowCap = windows.length === 1 ? 4 : 2;
  const entries = windows.map((w) => ({
    w,
    cap: Math.min(perWindowCap, Math.floor(w.minutes / MIN_ACTIVITY)),
    count: 0,
  }));
  const byRoom = [...entries].sort((a, b) => b.w.minutes - a.w.minutes);

  let assigned = 0;
  while (assigned < target) {
    let moved = false;
    for (const e of byRoom) {
      if (assigned >= target) break;
      if (e.count < e.cap) {
        e.count += 1;
        assigned += 1;
        moved = true;
      }
    }
    if (!moved) break;
  }

  const sleeps = sleepStarts(p);
  const raw: Omit<Slot, "index">[] = [];
  for (const { w, count } of entries) {
    if (count === 0) continue;
    const budget = Math.min(MAX_ACTIVITY, Math.max(MIN_ACTIVITY, Math.floor(w.minutes / count)));
    for (let j = 0; j < count; j++) {
      const start = w.start + j * budget;
      const nextSleep = sleeps.find((x) => x >= start) ?? Infinity;
      raw.push({ window: w.kind, start_time: fromMinutes(start), max_minutes: budget, calm: start + budget > nextSleep - 30 });
    }
  }

  return raw
    .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time))
    .map((s, index) => ({ ...s, index }));
}

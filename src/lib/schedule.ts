import type { WindowKind } from "./types";

export interface ScheduleInput {
  wake_time: string;
  nap_start: string;
  nap_end: string;
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

/**
 * Parent's free windows for a day, placed so they never touch the nap:
 * morning ends 15 min before the nap, weekend/evening windows start after the nap,
 * evening ends 15 min before bedtime.
 */
export function buildWindows(p: ScheduleInput, weekend: boolean): FreeWindow[] {
  const wake = toMinutes(p.wake_time);
  const napStart = toMinutes(p.nap_start);
  const napEnd = toMinutes(p.nap_end);
  const bed = toMinutes(p.bed_time);
  const out: FreeWindow[] = [];

  const morningStart = wake + 30;
  const morningMinutes = Math.min(p.morning_minutes, napStart - 15 - morningStart);
  if (morningMinutes >= MIN_ACTIVITY) {
    out.push({ kind: "morning", start: morningStart, minutes: morningMinutes });
  }

  let earliestEvening = napEnd + 30;
  if (weekend) {
    const weekendStart = napEnd + 30;
    const weekendMinutes = Math.min(p.weekend_minutes, bed - 60 - weekendStart);
    if (weekendMinutes >= MIN_ACTIVITY) {
      out.push({ kind: "weekend", start: weekendStart, minutes: weekendMinutes });
      earliestEvening = weekendStart + weekendMinutes + 30;
    }
  }

  const eveningStart = Math.max(bed - 45 - p.evening_minutes, earliestEvening);
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

  const raw: Omit<Slot, "index">[] = [];
  for (const { w, count } of entries) {
    if (count === 0) continue;
    const budget = Math.min(MAX_ACTIVITY, Math.max(MIN_ACTIVITY, Math.floor(w.minutes / count)));
    for (let j = 0; j < count; j++) {
      raw.push({ window: w.kind, start_time: fromMinutes(w.start + j * budget), max_minutes: budget });
    }
  }

  return raw
    .sort((a, b) => toMinutes(a.start_time) - toMinutes(b.start_time))
    .map((s, index) => ({ ...s, index }));
}

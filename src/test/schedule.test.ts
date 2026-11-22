import { describe, expect, it } from "vitest";

import { isWeekendDate, planSlots, toMinutes, type ScheduleInput } from "@/lib/schedule";

const base: ScheduleInput = {
  wake_time: "07:00",
  nap_start: "13:00",
  nap_end: "15:00",
  bed_time: "21:00",
  morning_minutes: 15,
  evening_minutes: 30,
  weekend_minutes: 60,
};

function overlapsNap(p: ScheduleInput, start: string, minutes: number) {
  const s = toMinutes(start);
  return s < toMinutes(p.nap_end) && s + minutes > toMinutes(p.nap_start);
}

describe("activity slots", () => {
  it("gives 3–4 slots on a weekday with typical free time", () => {
    const slots = planSlots(base, false);
    expect(slots.length).toBeGreaterThanOrEqual(3);
    expect(slots.length).toBeLessThanOrEqual(4);
  });

  it("never places an activity during the nap", () => {
    for (const p of [base, { ...base, nap_start: "11:30", nap_end: "14:30", morning_minutes: 60 }]) {
      for (const weekend of [false, true]) {
        for (const s of planSlots(p, weekend)) {
          expect(overlapsNap(p, s.start_time, s.max_minutes)).toBe(false);
        }
      }
    }
  });

  it("keeps every activity between 5 and 30 minutes", () => {
    for (const s of planSlots({ ...base, evening_minutes: 60, morning_minutes: 5 }, true)) {
      expect(s.max_minutes).toBeGreaterThanOrEqual(5);
      expect(s.max_minutes).toBeLessThanOrEqual(30);
    }
  });

  it("ends activities before bedtime", () => {
    for (const s of planSlots(base, true)) {
      expect(toMinutes(s.start_time) + s.max_minutes).toBeLessThanOrEqual(toMinutes(base.bed_time));
    }
  });

  it("uses the weekend window only on weekends", () => {
    expect(planSlots(base, false).some((s) => s.window === "weekend")).toBe(false);
    expect(planSlots(base, true).some((s) => s.window === "weekend")).toBe(true);
  });

  it("does not exceed the parent's free minutes", () => {
    const p = { ...base, morning_minutes: 0, evening_minutes: 10 };
    const slots = planSlots(p, false);
    expect(slots.reduce((sum, s) => sum + s.max_minutes, 0)).toBeLessThanOrEqual(10);
  });

  it("detects weekends", () => {
    expect(isWeekendDate("2026-11-21")).toBe(true);
    expect(isWeekendDate("2026-11-23")).toBe(false);
  });
});

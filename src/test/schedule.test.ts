import { describe, expect, it } from "vitest";

import { pickFromLibrary } from "@/lib/library";
import { isWeekendDate, planSlots, toMinutes, type ScheduleInput } from "@/lib/schedule";
import { defaultNaps, napRange, parseNaps } from "@/lib/sleep";

const nap = (start: string, end: string) => [{ start, end }];
const base: ScheduleInput = {
  wake_time: "07:00",
  naps: nap("13:00", "15:00"),
  bed_time: "21:00",
  morning_minutes: 15,
  evening_minutes: 30,
  weekend_minutes: 60,
};

function overlapsNap(p: ScheduleInput, start: string, minutes: number) {
  const s = toMinutes(start);
  return parseNaps(p.naps).some((n) => s < toMinutes(n.end) && s + minutes > toMinutes(n.start));
}

describe("activity slots", () => {
  it("gives 3–4 slots on a weekday with typical free time", () => {
    const slots = planSlots(base, false);
    expect(slots.length).toBeGreaterThanOrEqual(3);
    expect(slots.length).toBeLessThanOrEqual(4);
  });

  it("never places an activity during the nap", () => {
    for (const p of [base, { ...base, naps: nap("11:30", "14:30"), morning_minutes: 60 },
      { ...base, naps: [{ start: "09:30", end: "10:30" }, { start: "13:00", end: "14:30" }, { start: "17:00", end: "17:45" }], morning_minutes: 60, evening_minutes: 60, weekend_minutes: 90 }]) {
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

describe("naps by age", () => {
  it("default nap count follows the age table", () => {
    expect(napRange(2)).toEqual([5, 8]);
    expect(napRange(4)).toEqual([3, 4]);
    expect(napRange(8)).toEqual([2, 3]);
    expect(napRange(15)).toEqual([2, 2]);
    expect(napRange(24)).toEqual([1, 1]);
    expect(napRange(40)).toEqual([0, 1]);
    expect(defaultNaps(1, "07:00", "21:00")).toHaveLength(5);
    expect(defaultNaps(4, "07:00", "21:00")).toHaveLength(3);
    expect(defaultNaps(8, "07:00", "21:00")).toHaveLength(2);
    expect(defaultNaps(15, "07:00", "21:00")).toHaveLength(2);
    expect(defaultNaps(24, "07:00", "21:00")).toHaveLength(1);
  });
  it("default naps sit between wake-up and bedtime without overlapping", () => {
    for (const m of [1, 4, 8, 15, 24, 40]) {
      let prev = toMinutes("07:00");
      for (const n of defaultNaps(m, "07:00", "21:00")) {
        expect(toMinutes(n.start)).toBeGreaterThan(prev);
        prev = toMinutes(n.end);
      }
      expect(prev).toBeLessThan(toMinutes("21:00"));
    }
  });
  it("keeps 0 to 8 valid naps", () => {
    expect(parseNaps([])).toEqual([]);
    expect(parseNaps(Array.from({ length: 10 }, () => ({ start: "10:00", end: "11:00" })))).toHaveLength(8);
    expect(parseNaps([{ start: "12:00", end: "11:00" }, "x"])).toEqual([]);
  });
});

describe("calm before sleep", () => {
  it("marks slots ending within 30 min of a nap or bedtime as calm, others not", () => {
    const p = { ...base, morning_minutes: 60, naps: nap("08:50", "10:00") };
    for (const weekend of [false, true]) {
      for (const s of planSlots(p, weekend)) {
        const end = toMinutes(s.start_time) + s.max_minutes;
        const next = [toMinutes("08:50"), toMinutes(p.bed_time)].find((x) => x >= toMinutes(s.start_time)) ?? 0;
        expect(s.calm).toBe(end > next - 30);
      }
    }
    expect(planSlots(p, false).some((s) => s.calm)).toBe(true);
  });
  it("never puts movement games or walks into calm slots", () => {
    const slots = [0, 1, 2, 3].map((index) => ({ index, window: "evening" as const, start_time: `20:0${index}`, max_minutes: 20, calm: true }));
    for (let i = 0; i < 20; i++) {
      for (const item of pickFromLibrary(slots, [], `seed${i}`)) {
        expect(item.category).not.toBe("gross_motor");
        expect(item.outdoor).toBeFalsy();
      }
    }
  });
});

describe("baby woke up (under 4 months)", async () => {
  const { suggestForWakeWindow } = await import("@/lib/infant");
  const p = { ...base, naps: [{ start: "09:00", end: "10:00" }, { start: "12:00", end: "13:00" }] };
  it("gives 1–2 activities of 3–10 minutes", () => {
    for (let seed = 0; seed < 6; seed++) {
      const { items } = suggestForWakeWindow(p, toMinutes("10:00"), seed);
      expect(items.length).toBeGreaterThanOrEqual(1);
      expect(items.length).toBeLessThanOrEqual(2);
      for (const a of items) {
        expect(a.duration_min).toBeGreaterThanOrEqual(3);
        expect(a.duration_min).toBeLessThanOrEqual(10);
      }
    }
  });
  it("only calm activities within 30 min of the next nap, nothing when it is time to sleep", () => {
    for (let seed = 0; seed < 6; seed++) {
      const { items, left } = suggestForWakeWindow(p, toMinutes("11:40"), seed);
      expect(left).toBe(20);
      expect(items.every((a) => a.calm)).toBe(true);
    }
    expect(suggestForWakeWindow(p, toMinutes("11:59"), 0).items).toEqual([]);
  });
});

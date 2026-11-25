import { describe, expect, it } from "vitest";

import { lightenPlan } from "@/lib/light-plan";
import type { Category, PlanItem } from "@/lib/types";

const text = { title: "x", why: "x", steps: ["x"], materials: [] };
const item = (key: string, category: Category, duration_min: number, start_time: string): PlanItem => ({
  key,
  category,
  duration_min,
  window: "morning",
  start_time,
  ru: text,
  kz: text,
});

const day = [
  item("a", "gross_motor", 5, "07:30"),
  item("b", "speech", 15, "08:00"),
  item("c", "emotions_social", 5, "19:00"),
  item("d", "fine_motor", 20, "19:30"),
];

describe("lightenPlan (parent answered 😩)", () => {
  it("keeps at most 2 activities", () => {
    expect(lightenPlan(day)).toHaveLength(2);
  });

  it("keeps a single activity when the day has only one", () => {
    expect(lightenPlan([item("b", "speech", 15, "08:00")])).toHaveLength(1);
  });

  it("caps every kept activity at 10 minutes", () => {
    expect(lightenPlan([item("b", "speech", 15, "08:00")])[0]?.duration_min).toBe(10);
  });

  it("picks the shortest activities and keeps time order", () => {
    expect(lightenPlan(day).map((i) => i.key)).toEqual(["a", "c"]);
  });

  it("prefers calm activities over a walk when durations tie", () => {
    const tie = [item("a", "gross_motor", 5, "07:30"), item("b", "speech", 5, "08:00"), item("c", "emotions_social", 5, "19:00")];
    expect(lightenPlan([...tie, item("d", "fine_motor", 20, "20:00")]).map((i) => i.key)).toEqual(["b", "c"]);
  });

  it("shrinks a 3-activity day to 1", () => {
    expect(lightenPlan(day.slice(0, 3))).toHaveLength(1);
  });
});

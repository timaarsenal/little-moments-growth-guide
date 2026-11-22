import { describe, expect, it } from "vitest";

import { LIBRARY, pickFromLibrary } from "@/lib/library";
import type { Slot } from "@/lib/schedule";
import type { LogLite } from "@/lib/types";

const slots: Slot[] = [
  { index: 0, window: "morning", start_time: "07:30", max_minutes: 7 },
  { index: 1, window: "morning", start_time: "07:37", max_minutes: 7 },
  { index: 2, window: "evening", start_time: "19:45", max_minutes: 15 },
  { index: 3, window: "evening", start_time: "20:00", max_minutes: 15 },
];

const log = (category: string, reaction: string | null, key = `lib:x-${category}`): LogLite => ({
  activity_key: key,
  title: "x",
  category,
  status: "done",
  reaction,
  plan_date: "2026-11-01",
});

describe("library picks", () => {
  it("has 20 activities, 4 per category", () => {
    expect(LIBRARY).toHaveLength(20);
    const counts = new Map<string, number>();
    for (const a of LIBRARY) counts.set(a.category, (counts.get(a.category) ?? 0) + 1);
    expect([...counts.values()]).toEqual([4, 4, 4, 4, 4]);
  });

  it("uses different categories for the day's cards", () => {
    const plan = pickFromLibrary(slots, [], "ru", "seed");
    expect(new Set(plan.map((a) => a.category)).size).toBe(plan.length);
  });

  it("fits each activity into its slot", () => {
    const plan = pickFromLibrary(slots, [], "kz", "seed");
    plan.forEach((a, i) => expect(a.duration_min).toBeLessThanOrEqual(slots[i]?.max_minutes ?? 0));
  });

  it("prefers a category the child liked", () => {
    const history = [log("fine_motor", "liked"), log("fine_motor", "liked"), log("fine_motor", "liked")];
    const plan = pickFromLibrary([slots[2]!], history, "ru", "seed");
    expect(plan[0]?.category).toBe("fine_motor");
  });

  it("avoids a category the child disliked", () => {
    const history = [log("speech", "disliked"), log("speech", "disliked"), log("speech", "disliked")];
    const plan = pickFromLibrary(slots, history, "ru", "seed");
    expect(plan.some((a) => a.category === "speech")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { buildAiInput, mergeWithLibrary, parseAiPlan, summarizeHistory } from "@/lib/ai-plan";
import type { Slot } from "@/lib/schedule";
import type { LogLite } from "@/lib/types";

const slots: Slot[] = [
  { index: 0, window: "morning", start_time: "07:30", max_minutes: 10, calm: false },
  { index: 1, window: "evening", start_time: "19:45", max_minutes: 15, calm: false },
  { index: 2, window: "evening", start_time: "20:00", max_minutes: 15, calm: false },
];

const txt = (title: string) => ({ title, why: "Развивает речь малыша.", steps: ["Шаг один", "Шаг два"], materials: [] });
const act = (slot: number, category: string, duration_min: number) => ({
  slot,
  category,
  duration_min,
  ru: txt(`Занятие ${slot}`),
  kz: txt(`Сабақ ${slot}`),
});
const ai = (...activities: unknown[]) => JSON.stringify({ activities });

describe("AI plan parsing", () => {
  it("returns null for broken JSON so the library is used", () => {
    expect(parseAiPlan("not json", slots, "2026-11-23")).toBeNull();
    expect(parseAiPlan(ai({ slot: 0 }), slots, "2026-11-23")).toBeNull();
  });

  it("keeps durations between 5 minutes and the slot length", () => {
    const items = parseAiPlan(ai(act(0, "speech", 25), act(1, "fine_motor", 2)), slots, "2026-11-23");
    expect(items?.get(0)?.duration_min).toBe(10);
    expect(items?.get(1)?.duration_min).toBe(5);
  });

  it("drops a repeated category for the same day", () => {
    const items = parseAiPlan(ai(act(0, "speech", 5), act(1, "speech", 5)), slots, "2026-11-23");
    expect(items?.has(0)).toBe(true);
    expect(items?.has(1)).toBe(false);
  });

  it("places AI cards at the slot's window and time", () => {
    const item = parseAiPlan(ai(act(2, "speech", 10)), slots, "2026-11-23")?.get(2);
    expect(item).toMatchObject({ window: "evening", start_time: "20:00", key: "ai:2026-11-23:2" });
  });
});

describe("library fallback", () => {
  it("uses only the library when AI gives nothing", () => {
    const plan = mergeWithLibrary(slots, null, [], "seed");
    expect(plan.source).toBe("library");
    expect(plan.items).toHaveLength(3);
    expect(plan.items.every((i) => i.key.startsWith("lib:"))).toBe(true);
  });

  it("fills slots the AI missed with library cards of other categories", () => {
    const items = parseAiPlan(ai(act(0, "speech", 5)), slots, "2026-11-23");
    const plan = mergeWithLibrary(slots, items, [], "seed");
    expect(plan.source).toBe("ai");
    expect(plan.items).toHaveLength(3);
    expect(new Set(plan.items.map((i) => i.category)).size).toBe(3);
  });
});

describe("what the AI is told", () => {
  const log = (title: string, category: string, status: string, reaction: string | null): LogLite => ({
    activity_key: title,
    title,
    category,
    status,
    reaction,
    plan_date: "2026-11-20",
  });

  it("passes age in months and the child's reactions", () => {
    const history = [log("Пузыри", "speech", "done", "liked"), log("Бег", "gross_motor", "done", "disliked")];
    const input = JSON.parse(buildAiInput(27, slots, history, false));
    expect(input.child_age_months).toBe(27);
    expect(input.slots[0]).toEqual({ slot: 0, window: "morning", start_time: "07:30", max_minutes: 10, calm_only: false });
    expect(input.past_30_days.liked).toEqual(["Пузыри"]);
    expect(input.past_30_days.disliked).toEqual(["Бег"]);
  });

  it("counts skips per category", () => {
    const summary = summarizeHistory([log("A", "fine_motor", "skipped", null), log("B", "fine_motor", "skipped", null)]);
    expect(summary.byCategory.fine_motor.skipped).toBe(2);
  });
});

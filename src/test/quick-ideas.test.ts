import { describe, expect, it } from "vitest";
import { QUICK_LIBRARY, quickIdeas, quickToPlanned } from "@/lib/library";
import { localize } from "@/lib/types";

const PLACES = ["home", "kitchen", "car", "bath"];

describe("quickIdeas («Есть 5 минут»)", () => {
  it("every quick activity lasts 2–5 minutes", () => {
    for (const a of QUICK_LIBRARY) {
      expect(a.duration_min).toBeGreaterThanOrEqual(2);
      expect(a.duration_min).toBeLessThanOrEqual(5);
    }
  });
  it("shows only activities made for the chosen place", () => {
    for (const p of PLACES) {
      const ideas = quickIdeas(p, 24);
      expect(ideas.length).toBeGreaterThan(0);
      expect(ideas.every((a) => a.place === p)).toBe(true);
    }
  });
  it("kitchen uses food and dishes, bath uses water", () => {
    const kitchen = quickIdeas("kitchen", 24).map((a) => a.ru.materials.join(" ").toLowerCase()).join(" ");
    expect(kitchen).toMatch(/кастрюл|ложк|миск|яблок|банан|гречк/);
    expect(quickIdeas("bath", 24).every((a) => a.ru.materials.join(" ").toLowerCase().includes("вод"))).toBe(true);
  });
  it("respects the child's age", () => {
    expect(quickIdeas("kitchen", 12).map((a) => a.id)).not.toContain("k2");
    expect(quickIdeas("kitchen", 24).map((a) => a.id)).toContain("k2");
  });
  it("grains and water activities say «only with an adult»", () => {
    const grains = QUICK_LIBRARY.find((a) => a.id === "k2")!;
    expect(quickToPlanned(grains, "ru").supervised).toBe(true);
    for (const a of QUICK_LIBRARY.filter((x) => x.place === "bath")) expect(quickToPlanned(a, "kz").supervised).toBe(true);
    const doll = QUICK_LIBRARY.find((a) => a.id === "h1")!;
    expect(quickToPlanned(doll, "ru").supervised).toBeUndefined();
  });
  it("the doll stays a doll in every step", () => {
    const doll = QUICK_LIBRARY.find((a) => a.id === "h1")!;
    expect(doll.ru.steps.join(" ")).not.toMatch(/мишк|зайк|машинк/);
    expect(doll.kz.steps.join(" ")).not.toMatch(/аю|қоян|машина/);
  });
  it("plan items with water get the supervision line", () => {
    const text = { title: "Игра с водой", why: "", steps: ["Налейте воду в таз"], materials: ["Таз"] };
    const item = localize({ key: "x", category: "creative_sensory", duration_min: 5, window: "morning", start_time: "09:00", ru: text, kz: text }, "kz");
    expect(item.supervised).toBe(true);
  });
});

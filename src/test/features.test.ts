import { describe, expect, it } from "vitest";

import kz from "@/i18n/kz.json";
import ru from "@/i18n/ru.json";
import milestones from "@/data/milestones.json";
import { parseAiPlan } from "@/lib/ai-plan";
import { kazakhWordsLearned } from "@/lib/kazakh-words";
import { MILESTONES, shouldDiscuss } from "@/lib/milestones";
import { dayMinutes, streakDays, weekTotals } from "@/lib/minutes";
import type { Slot } from "@/lib/schedule";
import type { PlanItem } from "@/lib/types";
import { applyWeather, formatTemp, weatherReason } from "@/lib/weather";

const w = (min: number, max: number, code = 0) => ({ now: min, min, max, code });

describe("weather moves outdoor play home", () => {
  it("below −15 °C", () => {
    expect(weatherReason(w(-16, -10))).toBe("cold");
    expect(weatherReason(w(-15, -10))).toBeNull();
  });
  it("above +32 °C", () => {
    expect(weatherReason(w(20, 33))).toBe("hot");
    expect(weatherReason(w(20, 32))).toBeNull();
  });
  it("heavy rain or blizzard", () => {
    expect(weatherReason(w(5, 10, 65))).toBe("rain");
    expect(weatherReason(w(-5, -2, 75))).toBe("snow");
    expect(weatherReason(w(5, 10, 61))).toBeNull();
  });
  it("swaps only outdoor activities and formats the note", () => {
    const base: Omit<PlanItem, "key"> = { category: "gross_motor", duration_min: 20, window: "weekend", start_time: "16:00", ru: { title: "Прогулка", why: "w", steps: ["s"], materials: [] }, kz: { title: "Серуен", why: "w", steps: ["s"], materials: [] } };
    const items: PlanItem[] = [{ ...base, key: "a", outdoor: true }, { ...base, key: "b" }];
    const out = applyWeather(items, "cold");
    expect(out[0]?.movedIndoors).toBe(true);
    expect(out[0]?.ru.title).not.toBe("Прогулка");
    expect(out[1]?.ru.title).toBe("Прогулка");
    expect(applyWeather(items, null)[0]?.ru.title).toBe("Прогулка");
    expect(formatTemp(-25)).toBe("−25 °C");
  });
});

describe("minutes together", () => {
  const logs = [
    { plan_date: "2026-11-25", status: "done", duration_min: 10 },
    { plan_date: "2026-11-25", status: "skipped", duration_min: 15 },
    { plan_date: "2026-11-24", status: "done", duration_min: 20 },
    { plan_date: "2026-11-15", status: "done", duration_min: 30 },
  ];
  const rituals = [{ check_date: "2026-11-25", minutes: 5 }];
  it("counts done activities and rituals, not skipped ones", () => {
    expect(dayMinutes(logs, rituals, "2026-11-25")).toBe(15);
  });
  it("weekly totals for comparison", () => {
    expect(weekTotals(logs, rituals, "2026-11-25", 2)).toEqual([35, 30]);
  });
  it("streak of consecutive active days", () => {
    expect(streakDays(logs, rituals, "2026-11-25")).toBe(2);
    expect(streakDays(logs, rituals, "2026-11-26")).toBe(2);
  });
});

describe("pediatrician signals", () => {
  it("every milestone has isRedFlag and a discuss-after age", () => {
    for (const m of MILESTONES) {
      expect(typeof m.isRedFlag).toBe("boolean");
      expect(m.discuss_after_months).toBeGreaterThanOrEqual(m.age_months);
    }
  });
  it("calm note only for a key skill marked 'not yet' after its age", () => {
    const flag = MILESTONES.find((m) => m.isRedFlag && m.discuss_after_months === 24);
    if (!flag) throw new Error("no 24-month red flag");
    expect(shouldDiscuss(flag, "not_yet", 24)).toBe(true);
    expect(shouldDiscuss(flag, "not_yet", 23)).toBe(false);
    expect(shouldDiscuss(flag, "yes", 30)).toBe(false);
    const plain = MILESTONES.find((m) => !m.isRedFlag);
    if (!plain) throw new Error("no plain milestone");
    expect(shouldDiscuss(plain, "not_yet", 40)).toBe(false);
  });
  it("texts never use the forbidden words", () => {
    const all = JSON.stringify([ru, kz, milestones]).toLowerCase();
    for (const word of ["отставан", "проблем", "диагноз", "мәселе", "артта қал"]) expect(all).not.toContain(word);
  });
});

describe("AI plan: interests and Kazakh activities", () => {
  const slots: Slot[] = [0, 1, 2].map((i) => ({ index: i, window: "morning", start_time: `0${7 + i}:00`, max_minutes: 20 }) as Slot);
  const txt = { title: "Игра", why: "Развивает речь.", steps: ["Шаг один"], materials: [] };
  const act = (slot: number, category: string, extra: object) => ({ slot, category, duration_min: 10, outdoor: false, is_kazakh: false, kazakh_words: [], interests: [], ru: txt, kz: txt, ...extra });
  const raw = JSON.stringify({ activities: [
    act(0, "speech", { is_kazakh: true, kazakh_words: [{ kz: "алма", ru: "яблоко" }], interests: ["cars", "dolls"] }),
    act(1, "fine_motor", { is_kazakh: true }),
    act(2, "emotions_social", { is_kazakh: true, outdoor: true }),
  ] });
  it("keeps only the child's interests and at most 2 Kazakh activities", () => {
    const out = parseAiPlan(raw, slots, "2026-11-25", { interests: ["cars"], customInterest: "", bilingual: true, weather: null });
    expect(out?.get(0)?.interests).toEqual(["cars"]);
    expect([...(out?.values() ?? [])].filter((i) => i.kazakh).length).toBe(2);
    expect(out?.get(0)?.kz_words).toEqual([{ kz: "алма", ru: "яблоко" }]);
    expect(out?.get(2)?.outdoor).toBe(true);
  });
  it("no Kazakh badge when bilingual is off", () => {
    const out = parseAiPlan(raw, slots, "2026-11-25", { interests: [], customInterest: "", bilingual: false, weather: null });
    expect([...(out?.values() ?? [])].some((i) => i.kazakh)).toBe(false);
    expect(out?.get(0)?.interests).toBeUndefined();
  });
  it("counts unique Kazakh words from done Kazakh activities", () => {
    const item = { key: "k", kazakh: true, kz_words: [{ kz: "Алма", ru: "яблоко" }, { kz: "доп", ru: "мяч" }] } as unknown as PlanItem;
    const plans = [{ plan_date: "2026-11-24", items: [item] }, { plan_date: "2026-11-25", items: [item] }];
    expect(kazakhWordsLearned(plans, [
      { plan_date: "2026-11-24", activity_key: "k", status: "done" },
      { plan_date: "2026-11-25", activity_key: "k", status: "done" },
    ]).sort()).toEqual(["алма", "доп"]);
    expect(kazakhWordsLearned(plans, [{ plan_date: "2026-11-24", activity_key: "k", status: "skipped" }])).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";

import { mentionsCrisis } from "@/lib/crisis";

describe("mentionsCrisis", () => {
  it("flags thoughts of self-harm in Russian", () => {
    expect(mentionsCrisis("Иногда хочется навредить себе")).toBe(true);
  });

  it("flags despair in Kazakh", () => {
    expect(mentionsCrisis("Күшім қалмады, шыдай алмаймын")).toBe(true);
  });

  it("flags severe exhaustion regardless of case and ё", () => {
    expect(mentionsCrisis("Сил больше НЕТ")).toBe(true);
  });

  it("does not flag an ordinary question", () => {
    expect(mentionsCrisis("Чем занять малыша вечером, если он немного устал?")).toBe(false);
  });
});

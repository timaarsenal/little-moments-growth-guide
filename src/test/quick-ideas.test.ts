import { describe, expect, it } from "vitest";
import { quickIdeas } from "@/lib/library";

describe("quickIdeas", () => {
  it("bath suggests a water activity from the app library", () => {
    expect(quickIdeas("bath", 30).map((a) => a.id)).toContain("cs-04");
  });
  it("kitchen suggests pouring grains", () => {
    expect(quickIdeas("kitchen", 30).map((a) => a.id)).toContain("fm-03");
  });
  it("never suggests outdoor activities", () => {
    for (const p of ["home", "kitchen", "car", "bath"]) expect(quickIdeas(p, 30).every((a) => !a.outdoor)).toBe(true);
  });
});

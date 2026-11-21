import { describe, expect, it } from "vitest";

import { ageInMonths } from "@/lib/age";

describe("child age in months", () => {
  it("counts full months on the birthday day of month", () => {
    expect(ageInMonths("2024-08-20", "2026-11-20")).toBe(27);
  });

  it("does not count the current month before the day of birth", () => {
    expect(ageInMonths("2024-08-21", "2026-11-20")).toBe(26);
  });

  it("is 12 at exactly one year", () => {
    expect(ageInMonths("2025-11-20", "2026-11-20")).toBe(12);
  });
});

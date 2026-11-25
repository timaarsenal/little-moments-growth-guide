import { describe, expect, it } from "vitest";
import { ageBand, weekIndex, weeklyNoticeKey } from "@/lib/weekly-notice";

describe("weekly notice", () => {
  it("same text all week, different next week", () => {
    const mon = new Date(2026, 10, 23), sun = new Date(2026, 10, 29), next = new Date(2026, 10, 30);
    expect(weekIndex(mon)).toBe(weekIndex(sun));
    expect(weeklyNoticeKey(20, next)).not.toBe(weeklyNoticeKey(20, mon));
  });
  it("text depends on age", () => {
    expect(ageBand(3)).toBe("infant");
    expect(ageBand(9)).toBe("baby");
    expect(ageBand(18)).toBe("toddler");
    expect(ageBand(30)).toBe("preschool");
  });
});

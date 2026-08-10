import { describe, expect, it } from "vitest";
import { formatTabBadgeCount, resolveBadge } from "./bottomTabBadge";

describe("bottomTabBadge", () => {
  it("formatTabBadgeCount returns empty for zero", () => {
    expect(formatTabBadgeCount(0)).toBe("");
    expect(formatTabBadgeCount(0, true)).toBe("");
  });

  it("formatTabBadgeCount caps at 99+", () => {
    expect(formatTabBadgeCount(120)).toBe("99+");
    expect(formatTabBadgeCount(120, true)).toBe("~99+");
  });

  it("formatTabBadgeCount prefixes approximate counts", () => {
    expect(formatTabBadgeCount(5, true)).toBe("~5");
    expect(formatTabBadgeCount(5, false)).toBe("5");
  });

  it("resolveBadge reads object badges", () => {
    expect(resolveBadge({ count: 3, approximate: true })).toEqual({ count: 3, approximate: true });
    expect(resolveBadge(2)).toEqual({ count: 2, approximate: false });
  });
});

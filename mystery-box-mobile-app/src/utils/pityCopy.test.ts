import { describe, expect, it } from "vitest";
import { pityCopyI18nKey, pityPercentOf, resolvePityCopyKey } from "./pityCopy";

describe("pityCopy", () => {
  it("uses ready copy when remaining is already 0", () => {
    expect(resolvePityCopyKey({ remaining: 0, threshold: 50 })).toBe("pityReady");
    expect(pityCopyI18nKey({ remaining: 0, threshold: 50 })).toBe("boxDetails.pityReady");
    expect(pityCopyI18nKey({ remaining: 0, threshold: 50 }, true)).toBe("boxDetails.pityNearReady");
  });

  it("uses next-draw copy when remaining is 1", () => {
    expect(resolvePityCopyKey({ remaining: 1, threshold: 50 })).toBe("pityNext");
    expect(pityCopyI18nKey({ remaining: 1, threshold: 50 }, true)).toBe("boxDetails.pityNearNext");
  });

  it("keeps countdown copy when remaining is greater than 1", () => {
    expect(resolvePityCopyKey({ remaining: 12, threshold: 50 })).toBe("pityHint");
    expect(pityPercentOf({ current: 38, threshold: 50 })).toBe(76);
  });
});

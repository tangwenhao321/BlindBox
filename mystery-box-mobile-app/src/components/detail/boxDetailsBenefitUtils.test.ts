import { describe, expect, it } from "vitest";
import { pityPercentOf } from "./boxDetailsBenefitUtils";

describe("pityPercentOf", () => {
  it("computes rounded percent below cap", () => {
    expect(pityPercentOf({ current: 9, threshold: 10, remaining: 1 })).toBe(90);
  });

  it("caps at 100 when current exceeds threshold", () => {
    expect(pityPercentOf({ current: 12, threshold: 10, remaining: 0 })).toBe(100);
  });

  it("returns 0 when threshold is zero", () => {
    expect(pityPercentOf({ current: 5, threshold: 0, remaining: 0 })).toBe(0);
  });
});

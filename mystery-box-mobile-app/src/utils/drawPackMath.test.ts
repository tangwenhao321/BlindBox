import { describe, expect, it } from "vitest";
import { calcPackPriceFromRates, getBestPackTeaserFromRates, getDrawPackProgressHint } from "./drawPackMath";

const CONFIGS = [
  { drawCount: 1, discountRate: 10000, enabled: true },
  { drawCount: 10, discountRate: 9700, enabled: true },
];

describe("drawPackMath", () => {
  it("calcPackPriceFromRates applies discount", () => {
    const pack = calcPackPriceFromRates(10, 10, CONFIGS);
    expect(pack.price).toBe(97);
    expect(pack.saved).toBe(3);
  });

  it("getBestPackTeaserFromRates returns savings copy", () => {
    const teaser = getBestPackTeaserFromRates(10, CONFIGS);
    expect(teaser).toContain("10连省");
    expect(teaser).toContain("低至");
  });

  it("getDrawPackProgressHint nudges toward best pack", () => {
    const hint = getDrawPackProgressHint(2, 10, CONFIGS);
    expect(hint).toContain("再抽");
  });
});

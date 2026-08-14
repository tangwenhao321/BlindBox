import { describe, expect, it } from "vitest";
import { estimateMarketplaceNetProceeds, MARKETPLACE_PLATFORM_FEE_RATE } from "../utils/marketplaceProceeds";

/**
 * Automates HV/MP fee boundary + JOURNEY marketplace fee scenes at unit level.
 * Note: depends on getAppCurrency(); default path uses non-VND rounding.
 */
describe("marketplaceProceeds automation", () => {
  it("default fee rate is 5%", () => {
    expect(MARKETPLACE_PLATFORM_FEE_RATE).toBe(0.05);
  });

  it.each([
    [100, 95],
    [10, 9.5],
    [1, 0.95],
    [999, 949.05],
  ])("net proceeds price=%s => %s", (price, expected) => {
    expect(estimateMarketplaceNetProceeds(price)).toBe(expected);
  });

  it("rejects non-positive prices as 0", () => {
    expect(estimateMarketplaceNetProceeds(0)).toBe(0);
    expect(estimateMarketplaceNetProceeds(-1)).toBe(0);
    expect(estimateMarketplaceNetProceeds(Number.NaN)).toBe(0);
  });

  it("custom fee rate", () => {
    expect(estimateMarketplaceNetProceeds(100, 0.1)).toBe(90);
  });
});

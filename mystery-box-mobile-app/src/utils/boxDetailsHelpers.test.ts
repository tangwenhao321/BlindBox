import { describe, expect, it } from "vitest";
import { productTierGroup, sortProductsForCarousel } from "./boxDetailsHelpers";

describe("boxDetailsHelpers", () => {
  it("productTierGroup maps legendary to LEGEND", () => {
    expect(productTierGroup({ id: "1", name: "A", price: 1, qualityType: "LEGENDARY" })).toBe("LEGEND");
  });

  it("sortProductsForCarousel falls back to box when empty", () => {
    const items = sortProductsForCarousel([], { id: "box-1", name: "Demo", price: 9.9 });
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("box-1");
  });
});

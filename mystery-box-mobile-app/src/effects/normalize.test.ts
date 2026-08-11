import { describe, expect, it } from "vitest";
import { normalizePrizeProducts } from "./normalize";
import type { Product } from "../types";

describe("effects/normalize", () => {
  it("lists all prize rows and normalizes qualityType", () => {
    const products = normalizePrizeProducts({
      id: "o1",
      status: "TO_BE_PAID",
      items: [
        {
          products: [
            { id: "p1", name: "A", price: 1, qualityType: "legendary" },
            { id: "p1", name: "A", price: 1, qualityType: "legendary" },
            { id: "p2", name: "B", price: 1, qualityType: "???" },
          ],
        },
      ],
    });
    expect(products).toHaveLength(3);
    expect(products[0].qualityType).toBe("LEGENDARY");
    expect(products[2].qualityType).toBe("GENERAL");
  });

  it("synthesizes product id when backend omits it", () => {
    const products = normalizePrizeProducts({
      id: "o9",
      status: "FINISHED",
      // Cast because the backend can omit the product id, which is exactly what this asserts on.
      items: [{ id: "line-1", products: [{ name: "Mystery prize", price: 3 } as Product] }],
    });
    expect(products[0].id).toMatch(/^prize-o9-/);
  });
});


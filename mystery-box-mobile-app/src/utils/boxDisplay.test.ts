import { describe, expect, it } from "vitest";
import {
  dedupeHotBoxes,
  dedupeMysteryBoxes,
  getPoolRemainingLabel,
  getPoolSoldLabel,
  uniqueProducts,
} from "./boxDisplay";
import type { MysteryBox } from "../types";

describe("boxDisplay", () => {
  it("getPoolSoldLabel uses poolTotal and poolRemaining when set", () => {
    const box = { id: "b1", name: "Test", price: 10, poolTotal: 100, poolRemaining: 58 } as MysteryBox;
    expect(getPoolSoldLabel(box)).toBe("已售 42 张");
  });

  it("getPoolRemainingLabel returns null when unknown", () => {
    const box = { id: "b1", name: "Test", price: 10 } as MysteryBox;
    expect(getPoolRemainingLabel(box)).toBeNull();
  });

  it("dedupeMysteryBoxes keeps first box per id", () => {
    const a = { id: "dup", name: "A", price: 1, products: [] } as MysteryBox;
    const b = { id: "dup", name: "B", price: 2, products: [] } as MysteryBox;
    const c = { id: "other", name: "C", price: 3, products: [] } as MysteryBox;
    expect(dedupeMysteryBoxes([a, b, c])).toEqual([a, c]);
  });

  it("dedupeHotBoxes removes duplicate hot entries", () => {
    const rows = dedupeHotBoxes([
      { id: "x", name: "1", cover: "", poolRemaining: 1, drawCount7d: 1 },
      { id: "x", name: "2", cover: "", poolRemaining: 2, drawCount7d: 2 },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.name).toBe("1");
  });

  it("uniqueProducts drops duplicate product ids", () => {
    const products = uniqueProducts(
      [
        { id: "p1", name: "A", price: 1 },
        { id: "p1", name: "B", price: 2 },
        { id: "p2", name: "C", price: 3 },
      ],
      4,
    );
    expect(products.map((p) => p.id)).toEqual(["p1", "p2"]);
  });
});

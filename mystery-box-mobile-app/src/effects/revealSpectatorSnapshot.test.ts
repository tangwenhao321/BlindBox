import { describe, expect, it } from "vitest";
import { buildLiveSpectatorSnapshot, parseSpectatorProducts, parseSpectatorSnapshot } from "./revealSpectatorSnapshot";

describe("revealSpectatorSnapshot", () => {
  it("parses products array from snapshot", () => {
    const products = parseSpectatorProducts({
      products: [
        { id: "p1", name: "Alpha", qualityType: "LEGEND" },
        { id: "p2", name: "Beta" },
      ],
    });
    expect(products).toHaveLength(2);
    expect(products[0]?.id).toBe("p1");
  });

  it("falls back to legacy single-product snapshot", () => {
    const parsed = parseSpectatorSnapshot({
      productId: "legacy",
      productName: "Legacy Prize",
      revealIndex: 0,
      total: 1,
    });
    expect(parsed.products).toHaveLength(1);
    expect(parsed.products[0]?.name).toBe("Legacy Prize");
  });

  it("builds live snapshot with full product list", () => {
    const snapshot = buildLiveSpectatorSnapshot({
      revealIndex: 1,
      total: 3,
      products: [
        { id: "a", name: "A", price: 1 },
        { id: "b", name: "B", price: 1, qualityType: "HIDDEN" },
        { id: "c", name: "C", price: 1 },
      ],
    });
    expect(snapshot.total).toBe(3);
    expect(snapshot.revealIndex).toBe(1);
    expect(Array.isArray(snapshot.products)).toBe(true);
    expect((snapshot.products as unknown[]).length).toBe(3);
    expect(snapshot.productId).toBe("b");
  });

  it("includes optional cover on live snapshot products", () => {
    const snapshot = buildLiveSpectatorSnapshot({
      revealIndex: 0,
      total: 1,
      products: [{ id: "p1", name: "Prize", price: 1, cover: "https://cdn/p1.png" }],
    });
    const products = snapshot.products as Array<Record<string, unknown>>;
    expect(products[0]?.cover).toBe("https://cdn/p1.png");
  });
});

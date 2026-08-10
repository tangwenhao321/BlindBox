import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchWarehouseItemCount, fetchWarehouseItems } from "./warehouseService";

const { getMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
}));

vi.mock("../api", () => ({
  api: { get: getMock },
  buildAuthHeaders: (token: string) => ({ token }),
}));

describe("warehouseService", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it("returns items from legacy array response", async () => {
    getMock.mockResolvedValueOnce({
      data: [
        {
          orderId: "order-1",
          orderStatus: "TO_BE_DELIVERED",
          orderItemId: "item-1",
          mysteryBoxId: "box-1",
          productId: "prod-1",
          productName: "Prize",
          productCover: null,
          qualityType: "A",
          source: "DRAW",
          listingId: null,
        },
      ],
    });
    const result = await fetchWarehouseItems("token-1", true, 25, 10);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.productName).toBe("Prize");
    expect(result.approximate).toBe(false);
    expect(getMock).toHaveBeenCalledWith("/front/warehouse/items", {
      params: { pendingOnly: true, limit: 25, offset: 10 },
      headers: { token: "token-1" },
    });
  });

  it("returns items and approximate from wrapped list response", async () => {
    getMock.mockResolvedValueOnce({
      data: {
        items: [{ orderId: "order-2", productName: "Other" }],
        approximate: true,
      },
    });
    const result = await fetchWarehouseItems("token-2");
    expect(result.items[0]?.orderId).toBe("order-2");
    expect(result.approximate).toBe(true);
  });

  it("returns empty items when result missing", async () => {
    getMock.mockResolvedValueOnce({ data: {} });
    const result = await fetchWarehouseItems("token-3");
    expect(result.items).toEqual([]);
  });

  it("returns count from direct response", async () => {
    getMock.mockResolvedValueOnce({ data: { count: 12 } });
    const result = await fetchWarehouseItemCount("token-4", true);
    expect(result).toEqual({ count: 12, approximate: false });
  });

  it("returns approximate flag when present", async () => {
    getMock.mockResolvedValueOnce({ data: { count: 500, approximate: true } });
    const result = await fetchWarehouseItemCount("token-5");
    expect(result).toEqual({ count: 500, approximate: true });
  });

  it("returns count from wrapped result", async () => {
    getMock.mockResolvedValueOnce({ data: { result: { count: 3, approximate: false } } });
    const result = await fetchWarehouseItemCount("token-6");
    expect(result).toEqual({ count: 3, approximate: false });
  });
});

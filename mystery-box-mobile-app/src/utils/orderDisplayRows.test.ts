import { describe, expect, it } from "vitest";
import { ORDER_STATUS } from "../config/constants";
import { computeMyOrdersTabCounts, countOrderTabRows, filterOrderDisplayRows } from "./orderDisplayRows";
import type { Order } from "../types";
import type { WarehouseApiItem } from "../services/warehouseService";

const warehouseItems: WarehouseApiItem[] = [
  {
    orderId: "o1",
    orderStatus: ORDER_STATUS.TO_BE_DELIVERED,
    orderItemId: "i1",
    mysteryBoxId: "b1",
    productId: "p1",
    productName: "Product A",
    productCover: null,
    qualityType: null,
    source: "ORDER",
    listingId: null,
    pendingShipRequest: true,
  },
  {
    orderId: "o2",
    orderStatus: ORDER_STATUS.TO_BE_DELIVERED,
    orderItemId: "i2",
    mysteryBoxId: "b1",
    productId: "p2",
    productName: "Product B",
    productCover: null,
    qualityType: null,
    source: "ORDER",
    listingId: null,
    pendingShipRequest: false,
  },
];

describe("orderDisplayRows warehouse alignment", () => {
  it("ALL tab uses warehouse inventory plus unpaid orders", () => {
    const orders: Order[] = [
      { id: "unpaid", status: ORDER_STATUS.TO_BE_PAID },
      {
        id: "o1",
        status: ORDER_STATUS.TO_BE_DELIVERED,
        items: [{ id: "i1", products: [{ id: "p1", name: "Old name" }, { id: "p9", name: "Decomposed" }] }],
      },
    ];
    const allRows = filterOrderDisplayRows(orders, "ALL", "", warehouseItems);
    expect(allRows).toHaveLength(3);
    expect(allRows.some((row) => row.key.startsWith("unpaid:"))).toBe(true);
    expect(allRows.filter((row) => row.key.startsWith("wh:"))).toHaveLength(2);
  });

  it("ship tab count is a subset of ALL warehouse rows", () => {
    const orders: Order[] = [];
    const allCount = countOrderTabRows(orders, "ALL", warehouseItems);
    const shipCount = countOrderTabRows(orders, ORDER_STATUS.TO_BE_DELIVERED, warehouseItems);
    expect(shipCount).toBe(1);
    expect(allCount).toBe(2);
    expect(shipCount).toBeLessThanOrEqual(allCount);
  });

  it("computeMyOrdersTabCounts exposes counts for each tab id", () => {
    const orders: Order[] = [{ id: "unpaid", status: ORDER_STATUS.TO_BE_PAID }];
    const counts = computeMyOrdersTabCounts(orders, warehouseItems);
    expect(counts.ALL).toBe(3);
    expect(counts[ORDER_STATUS.TO_BE_DELIVERED]).toBe(1);
    expect(counts[ORDER_STATUS.TO_BE_PAID]).toBe(1);
  });

  it("ALL tab uses warehouse total count when list is truncated", () => {
    const orders: Order[] = [{ id: "unpaid", status: ORDER_STATUS.TO_BE_PAID }];
    const counts = computeMyOrdersTabCounts(orders, warehouseItems, { warehouseTotalCount: 156 });
    expect(counts.ALL).toBe(157);
  });
});

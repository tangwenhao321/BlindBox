import { describe, expect, it } from "vitest";
import { ORDER_STATUS } from "../config/constants";
import { computeOrderBadges } from "./orderBadges";
import type { Order } from "../types";
import type { WarehouseApiItem } from "../services/warehouseService";

describe("computeOrderBadges", () => {
  it("counts orders by status", () => {
    const orders: Order[] = [
      { id: "1", status: ORDER_STATUS.TO_BE_PAID },
      { id: "2", status: ORDER_STATUS.TO_BE_DELIVERED },
      { id: "3", status: ORDER_STATUS.TO_BE_RECEIVED },
      { id: "4", status: ORDER_STATUS.FINISHED },
    ];
    expect(computeOrderBadges(orders)).toEqual({
      pendingPay: 1,
      pendingDelivery: 1,
      pendingReceive: 1,
      completed: 1,
    });
  });

  it("uses warehouse ship-pending count when warehouse items are provided", () => {
    const orders: Order[] = [
      { id: "1", status: ORDER_STATUS.TO_BE_DELIVERED },
      { id: "2", status: ORDER_STATUS.TO_BE_DELIVERED },
    ];
    const warehouseItems: WarehouseApiItem[] = [
      {
        orderId: "1",
        orderStatus: ORDER_STATUS.TO_BE_DELIVERED,
        orderItemId: "i1",
        mysteryBoxId: "b1",
        productId: "p1",
        productName: "A",
        productCover: null,
        qualityType: null,
        source: "ORDER",
        listingId: null,
        pendingShipRequest: true,
      },
      {
        orderId: "2",
        orderStatus: ORDER_STATUS.TO_BE_DELIVERED,
        orderItemId: "i2",
        mysteryBoxId: "b1",
        productId: "p2",
        productName: "B",
        productCover: null,
        qualityType: null,
        source: "ORDER",
        listingId: null,
        pendingShipRequest: false,
      },
    ];
    expect(computeOrderBadges(orders, warehouseItems).pendingDelivery).toBe(1);
  });
});

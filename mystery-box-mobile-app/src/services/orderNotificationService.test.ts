import { describe, expect, it } from "vitest";
import { ORDER_STATUS } from "../config/constants";
import { buildOrderNotificationEvents } from "./orderNotificationService";
import type { Order } from "../types";

function makeOrder(partial: Partial<Order> & Pick<Order, "id" | "status">): Order {
  return {
    createdTime: partial.createdTime ?? "2026-01-02T10:00:00",
    items: partial.items ?? [{ mysteryBox: { name: "测试盲盒" } }],
    baseOrder: partial.baseOrder,
    ...partial,
  };
}

describe("orderNotificationService", () => {
  it("builds pay reminder for unpaid orders", () => {
    const events = buildOrderNotificationEvents([
      makeOrder({ id: "o1", status: ORDER_STATUS.TO_BE_PAID }),
    ]);
    expect(events.some((e) => e.type === "pay" && e.orderId === "o1")).toBe(true);
  });

  it("builds tracking event when tracking number exists", () => {
    const events = buildOrderNotificationEvents([
      makeOrder({
        id: "o2",
        status: ORDER_STATUS.TO_BE_RECEIVED,
        baseOrder: { trackingNumber: "SF123456" } as Order["baseOrder"],
      }),
    ]);
    expect(events.some((e) => e.type === "shipped" && e.body.includes("SF123456"))).toBe(true);
  });

  it("sorts events by createdAt descending", () => {
    const events = buildOrderNotificationEvents([
      makeOrder({ id: "o-old", status: ORDER_STATUS.TO_BE_PAID, createdTime: "2026-01-01" }),
      makeOrder({ id: "o-new", status: ORDER_STATUS.TO_BE_DELIVERED, createdTime: "2026-01-03" }),
    ]);
    expect(events[0]?.orderId).toBe("o-new");
  });
});

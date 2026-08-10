import { describe, expect, it } from "vitest";
import { extractPushData, resolveNotificationDeepLink } from "./notificationDeepLink";

describe("notificationDeepLink", () => {
  it("resolves warehouse ship requests", () => {
    expect(resolveNotificationDeepLink("WAREHOUSE_SHIP", "req-1")).toEqual({
      view: "shipRequests",
      shipRequestId: "req-1",
    });
  });

  it("resolves order details", () => {
    expect(resolveNotificationDeepLink("ORDER", "order-1")).toEqual({
      view: "orderDetails",
      orderId: "order-1",
    });
  });

  it("resolves pending payment reminder to order details", () => {
    expect(resolveNotificationDeepLink("PENDING_PAY", "order-2")).toEqual({
      view: "orderDetails",
      orderId: "order-2",
    });
  });

  it("extracts push payload fields", () => {
    expect(extractPushData({ category: "REFUND", refId: "r1" })).toEqual({
      category: "REFUND",
      refId: "r1",
    });
  });
});

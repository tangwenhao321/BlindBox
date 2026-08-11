import { describe, expect, it } from "vitest";
import {
  getRoutePath,
  resolveDeepLinkFromAppPath,
  resolveDeepLinkFromPush,
  resolveViewFromPathSegment,
} from "./routeRegistry";

describe("routeRegistry", () => {
  it("maps views to URL path segments", () => {
    expect(getRoutePath("orders")).toBe("orders");
    expect(getRoutePath("shipRequests")).toBe("ship-requests");
    expect(resolveViewFromPathSegment("exchange-mall")).toBe("exchangeMall");
  });

  it("resolves order detail paths", () => {
    expect(resolveDeepLinkFromAppPath("order/ord-42")).toEqual({
      view: "orderDetails",
      orderId: "ord-42",
    });
  });

  it("resolves static paths", () => {
    expect(resolveDeepLinkFromAppPath("favorites")).toEqual({ view: "favorites" });
  });

  it("resolves push categories", () => {
    expect(resolveDeepLinkFromPush("ORDER", "o1")).toEqual({
      view: "orderDetails",
      orderId: "o1",
    });
    expect(resolveDeepLinkFromPush("PENDING_PAY", "o2")).toEqual({
      view: "orderDetails",
      orderId: "o2",
    });
    expect(resolveDeepLinkFromPush("WAREHOUSE_SHIP", "sr1")).toEqual({
      view: "shipRequests",
      shipRequestId: "sr1",
    });
    expect(resolveDeepLinkFromPush("MARKETPLACE", null)).toEqual({ view: "marketplace" });
    expect(resolveDeepLinkFromPush("COUPON", null)).toEqual({ view: "coupons" });
    expect(resolveDeepLinkFromPush("COMMUNITY", null)).toEqual({ view: "community" });
    expect(resolveDeepLinkFromPush("WELFARE", null)).toEqual({ view: "welfare" });
    expect(resolveDeepLinkFromPush("MESSAGES", null)).toEqual({ view: "messages" });
    expect(resolveDeepLinkFromPush("RESTOCK", "box-1")).toEqual({
      view: "boxDetails",
      boxId: "box-1",
    });
    expect(resolveDeepLinkFromPush("PITY", "box-2")).toEqual({
      view: "boxDetails",
      boxId: "box-2",
    });
    expect(resolveDeepLinkFromPush("RESTOCK", null)).toBeNull();
    expect(resolveDeepLinkFromPush("PITY", null)).toBeNull();
  });

  it("resolves box detail paths", () => {
    expect(resolveDeepLinkFromAppPath("box/box-99")).toEqual({
      view: "boxDetails",
      boxId: "box-99",
    });
    expect(getRoutePath("settings")).toBe("settings");
    expect(getRoutePath("fairnessVerify")).toBe("fairness");
  });
});

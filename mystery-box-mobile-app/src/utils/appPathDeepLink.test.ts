import { describe, expect, it } from "vitest";
import { parseAppPathDeepLink } from "./appPathDeepLink";

describe("parseAppPathDeepLink", () => {
  it("opens order details from https path", () => {
    expect(parseAppPathDeepLink("https://mysterybox.example.com/order/ord-99")).toEqual({
      view: "orderDetails",
      orderId: "ord-99",
    });
  });

  it("opens orders tab from custom scheme", () => {
    expect(parseAppPathDeepLink("mysterybox://orders")).toEqual({ view: "orders" });
  });

  it("returns null for invite paths", () => {
    expect(parseAppPathDeepLink("https://mysterybox.example.com/invite/ABC")).toBeNull();
  });

  it("opens favorites from custom scheme", () => {
    expect(parseAppPathDeepLink("mysterybox://favorites")).toEqual({ view: "favorites" });
  });
});

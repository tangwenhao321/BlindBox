import { describe, expect, it, vi } from "vitest";
import { appViewToHref } from "./appViewRoutes";

const push = vi.fn();
const replace = vi.fn();
const back = vi.fn();

vi.mock("expo-router", () => ({
  router: {
    push,
    replace,
    back,
    canGoBack: () => true,
  },
}));

describe("expoRouterNavigationSync", () => {
  it("appViewToHref matches tab routes", () => {
    expect(appViewToHref("home")).toBe("/(shell)/(tabs)/home");
    expect(appViewToHref("orders")).toBe("/orders");
    expect(appViewToHref("orderDetails", { orderId: "ord-1" })).toBe("/order/ord-1");
  });
});

describe("syncAppViewToExpoRouter", () => {
  it("pushes stack routes and replaces tabs", async () => {
    push.mockReset();
    replace.mockReset();
    const { syncAppViewToExpoRouter, syncExpoRouterBack } = await import("./expoRouterNavigationSync");

    syncAppViewToExpoRouter("orders");
    expect(push).toHaveBeenCalledWith("/orders");

    syncAppViewToExpoRouter("home", { replace: true });
    expect(replace).toHaveBeenCalledWith("/(shell)/(tabs)/home");

    syncAppViewToExpoRouter("orderDetails", { orderId: "abc" });
    expect(push).toHaveBeenCalledWith("/order/abc");

    syncExpoRouterBack();
    expect(back).toHaveBeenCalled();
  });
});

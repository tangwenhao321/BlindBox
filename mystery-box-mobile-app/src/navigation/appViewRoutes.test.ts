import { describe, expect, it } from "vitest";
import { parseAppPathDeepLink } from "../utils/appPathDeepLink";
import { appPathToHref, appViewToHref, deepLinkToHref, listRoutableAppViews } from "./appViewRoutes";
import { getRoutePath } from "./routeRegistry";

describe("appViewRoutes", () => {
  it("maps every routable AppView to an href with a registered path segment", () => {
    for (const view of listRoutableAppViews()) {
      const href = appViewToHref(view);
      expect(href).toMatch(/^\//);
      if (view === "orderDetails") {
        expect(appViewToHref(view, { orderId: "ord-1" })).toBe("/order/ord-1");
        continue;
      }
      if (view === "boxDetails") {
        expect(appViewToHref(view, { boxId: "box-1" })).toBe("/box/box-1");
        continue;
      }
      const segment = getRoutePath(view);
      if (segment) {
        expect(href).toContain(segment);
      }
    }
  });

  it("round-trips static app paths through parseAppPathDeepLink and appPathToHref", () => {
    const staticPaths = ["orders", "favorites", "settings", "ship-requests", "exchange-mall", "fairness"];
    for (const path of staticPaths) {
      const link = parseAppPathDeepLink(path);
      expect(link).not.toBeNull();
      expect(appPathToHref(path)).toBe(deepLinkToHref(link!));
    }
  });

  it("round-trips dynamic order and box paths", () => {
    expect(appPathToHref("order/ord-42")).toBe("/order/ord-42");
    expect(appPathToHref("box/box-99")).toBe("/box/box-99");
    expect(parseAppPathDeepLink("order/ord-42")).toEqual({ view: "orderDetails", orderId: "ord-42" });
    expect(deepLinkToHref({ view: "orderDetails", orderId: "ord-42" })).toBe("/order/ord-42");
  });

  it("maps tab views under (shell)/(tabs)", () => {
    expect(appViewToHref("home")).toBe("/(shell)/(tabs)/home");
    expect(appViewToHref("profile")).toBe("/(shell)/(tabs)/profile");
  });

  it("appPathToHref delegates to routeRegistry deep link resolver", () => {
    expect(appPathToHref("orders")).toBe("/orders");
    expect(appPathToHref("order/ord-1")).toBe("/order/ord-1");
    expect(appPathToHref("invite/abc")).toBeNull();
  });
});

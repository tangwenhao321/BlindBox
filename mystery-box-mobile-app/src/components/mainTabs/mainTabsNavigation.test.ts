import { describe, expect, it } from "vitest";
import {
  computeProfileTabBadge,
  isMainTabsSubPage,
  MAIN_TABS_SUB_PAGES,
  resolveMainTabsActiveTab,
} from "./mainTabsNavigation";
import { isTabAppView } from "./appViews";

describe("mainTabsNavigation", () => {
  it("MAIN_TABS_SUB_PAGES excludes bottom tabs", () => {
    expect(MAIN_TABS_SUB_PAGES.every((view) => !isTabAppView(view))).toBe(true);
    expect(MAIN_TABS_SUB_PAGES).toContain("orders");
    expect(MAIN_TABS_SUB_PAGES).toContain("boxDetails");
  });
  it("detects sub-pages vs root tabs", () => {
    expect(isMainTabsSubPage("home")).toBe(false);
    expect(isMainTabsSubPage("orders")).toBe(true);
    expect(isMainTabsSubPage("catalogSearch")).toBe(true);
  });

  it("resolves bottom tab highlight for sub-pages", () => {
    expect(resolveMainTabsActiveTab("home")).toBe("home");
    expect(resolveMainTabsActiveTab("catalogSearch")).toBe("mall");
    expect(resolveMainTabsActiveTab("marketplace")).toBe("warehouse");
    expect(resolveMainTabsActiveTab("marketplaceChat")).toBe("warehouse");
    expect(resolveMainTabsActiveTab("orders")).toBe("profile");
  });

  it("computes profile badge from messages and order actions", () => {
    expect(
      computeProfileTabBadge(2, { pendingPay: 1, pendingDelivery: 0, pendingReceive: 0 }),
    ).toBe(2);
    expect(
      computeProfileTabBadge(0, { pendingPay: 3, pendingDelivery: 1, pendingReceive: 0 }),
    ).toBe(4);
  });
});

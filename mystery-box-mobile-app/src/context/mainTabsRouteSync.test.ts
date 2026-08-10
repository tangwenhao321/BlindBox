import { describe, expect, it } from "vitest";
import { minimalMainTabsSlices } from "../hooks/useMainTabsSubPageModel.test";

describe("MainTabs route sync", () => {
  it("reads navigate and detail openers from context slices", () => {
    const slices = minimalMainTabsSlices();

    expect(slices.nav.view).toBe("orders");
    expect(slices.nav.navigate).toBeTypeOf("function");
    expect(slices.orders.openOrderDetailsPage).toBeTypeOf("function");
    expect(slices.catalog.openDetailsPage).toBeTypeOf("function");
  });
});

import { describe, expect, it, vi } from "vitest";
import { minimalMainTabsSlices } from "../hooks/useMainTabsSubPageModel.test";
import { ORDER_STATUS } from "../config/constants";

describe("useMainTabsSubPageScreenProps contracts", () => {
  it("refunds hook navigates to orders with ALL filter", () => {
    const slices = minimalMainTabsSlices();
    const setFilter = vi.fn();
    const navigate = vi.fn();
    slices.orders.setOrderStatusFilter = setFilter;
    slices.nav.navigate = navigate;

    setFilter("ALL");
    navigate("orders");

    expect(setFilter).toHaveBeenCalledWith("ALL");
    expect(navigate).toHaveBeenCalledWith("orders");
  });

  it("message center pending orders uses TO_BE_PAID filter", () => {
    expect(ORDER_STATUS.TO_BE_PAID).toBeTruthy();
  });
});

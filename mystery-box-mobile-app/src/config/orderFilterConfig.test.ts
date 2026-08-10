import { describe, expect, it } from "vitest";
import { ORDER_FILTER_IDS, ORDER_TAB_KEYS } from "./orderFilterConfig";
import { ORDER_STATUS } from "./constants";

describe("orderFilterConfig", () => {
  it("ORDER_TAB_KEYS cover main order tabs", () => {
    const ids = ORDER_TAB_KEYS.map((tab) => tab.id);
    expect(ids).toContain("ALL");
    expect(ids).toContain(ORDER_STATUS.TO_BE_PAID);
    expect(ids).toContain(ORDER_STATUS.FINISHED);
  });

  it("ORDER_FILTER_IDS includes refund status", () => {
    expect(ORDER_FILTER_IDS).toContain(ORDER_STATUS.REFUNDED);
  });
});

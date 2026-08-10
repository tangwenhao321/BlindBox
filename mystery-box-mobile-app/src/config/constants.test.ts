import { describe, expect, it } from "vitest";
import { ORDER_STATUS } from "./constants";
import { ORDER_FILTER_IDS } from "./orderFilterConfig";

describe("constants", () => {
  it("contains required order statuses", () => {
    expect(ORDER_STATUS.TO_BE_PAID).toBe("TO_BE_PAID");
    expect(ORDER_STATUS.REFUNDED).toBe("REFUNDED");
  });

  it("includes ALL filter and refund filter", () => {
    expect(ORDER_FILTER_IDS).toContain("ALL");
    expect(ORDER_FILTER_IDS).toContain(ORDER_STATUS.REFUNDED);
  });
});


import { describe, expect, it } from "vitest";
import { filterOrders } from "./useOrders";
import type { Order } from "../types";

const orders: Order[] = [
  { id: "A-001", status: "TO_BE_PAID" },
  { id: "A-002", status: "CLOSED" },
  { id: "B-100", status: "TO_BE_PAID" },
];

describe("filterOrders", () => {
  it("filters by status", () => {
    const result = filterOrders(orders, "TO_BE_PAID", "");
    expect(result).toHaveLength(2);
  });

  it("filters by keyword case-insensitively", () => {
    const result = filterOrders(orders, "ALL", "a-00");
    expect(result.map((item) => item.id)).toEqual(["A-001", "A-002"]);
  });

  it("treats empty status as ALL", () => {
    expect(filterOrders(orders, "", "")).toHaveLength(3);
  });
});


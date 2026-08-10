import { describe, expect, it } from "vitest";
import { queryKeys } from "../query/keys";

const SENSITIVE_QUERY_ROOTS = new Set(["orders", "addresses", "notifications", "coupons"]);

function shouldPersistQuery(queryKey: readonly unknown[]): boolean {
  const root = queryKey[0];
  return typeof root !== "string" || !SENSITIVE_QUERY_ROOTS.has(root);
}

describe("query persist policy", () => {
  it("skips sensitive order and address queries", () => {
    expect(shouldPersistQuery(queryKeys.orders.list("tok"))).toBe(false);
    expect(shouldPersistQuery(queryKeys.addresses.list("tok"))).toBe(false);
    expect(shouldPersistQuery(queryKeys.notifications.list("tok"))).toBe(false);
    expect(shouldPersistQuery(queryKeys.coupons.list("tok"))).toBe(false);
  });

  it("allows catalog and favorites queries", () => {
    expect(shouldPersistQuery(queryKeys.boxes.home("tok"))).toBe(true);
    expect(shouldPersistQuery(queryKeys.favorites.ids("tok"))).toBe(true);
  });
});

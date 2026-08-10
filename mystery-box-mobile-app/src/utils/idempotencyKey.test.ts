import { describe, expect, it } from "vitest";
import { createIdempotencyKey, IDEMPOTENCY_HEADER } from "./idempotencyKey";

describe("idempotencyKey", () => {
  it("creates scoped keys", () => {
    const key = createIdempotencyKey("create-order", "order-seed");
    expect(key).toBe("order-seed");
    expect(IDEMPOTENCY_HEADER).toBe("x-idempotency-key");
  });

  it("truncates overly long seeds", () => {
    const long = "x".repeat(200);
    expect(createIdempotencyKey("pay-order", long).length).toBe(120);
  });
});

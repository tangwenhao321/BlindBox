/** Stable idempotency scope prefix for order write APIs. */
export type IdempotencyScope =
  | "create-order"
  | "pay-order"
  | "prepay-wechat"
  | "prepay-vnpay"
  | "redeem-item"
  | "redeem-order";

let counter = 0;

export function createIdempotencyKey(scope: IdempotencyScope, seed?: string): string {
  const base = seed?.trim() || `${scope}-${Date.now()}-${++counter}`;
  return base.length > 120 ? base.slice(0, 120) : base;
}

export const IDEMPOTENCY_HEADER = "x-idempotency-key";

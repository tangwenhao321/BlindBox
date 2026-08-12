import { getAppCurrency } from "./formatCurrency";

/** Matches backend default `app.marketplace.fee-rate` (5%). */
export const MARKETPLACE_PLATFORM_FEE_RATE = 0.05;

/** Net proceeds after platform fee, rounded per app currency (VND = integer ₫). */
export function estimateMarketplaceNetProceeds(listPrice: number, feeRate?: number): number {
  const price = Number(listPrice);
  if (!Number.isFinite(price) || price <= 0) return 0;
  const rate =
    feeRate != null && Number.isFinite(feeRate) && feeRate >= 0 ? feeRate : MARKETPLACE_PLATFORM_FEE_RATE;
  const raw = price * (1 - rate);
  return getAppCurrency() === "VND" ? Math.round(raw) : Math.round(raw * 100) / 100;
}

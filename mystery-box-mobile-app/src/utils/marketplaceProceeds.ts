/** Matches backend default `app.marketplace.fee-rate` (5%). */
export const MARKETPLACE_PLATFORM_FEE_RATE = 0.05;

export function estimateMarketplaceNetProceeds(listPrice: number, feeRate?: number): number {
  const price = Number(listPrice);
  if (!Number.isFinite(price) || price <= 0) return 0;
  const rate =
    feeRate != null && Number.isFinite(feeRate) && feeRate >= 0 ? feeRate : MARKETPLACE_PLATFORM_FEE_RATE;
  return Math.round(price * (1 - rate) * 100) / 100;
}

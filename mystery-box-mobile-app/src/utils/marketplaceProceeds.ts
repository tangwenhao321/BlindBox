/** Matches backend default `app.marketplace.fee-rate` (5%). */
export const MARKETPLACE_PLATFORM_FEE_RATE = 0.05;

export function estimateMarketplaceNetProceeds(listPrice: number): number {
  const price = Number(listPrice);
  if (!Number.isFinite(price) || price <= 0) return 0;
  return Math.round(price * (1 - MARKETPLACE_PLATFORM_FEE_RATE) * 100) / 100;
}

import { normalizeQualityTier } from "./quality";

const REDEEM_RATE = 0.35;

/** Mirror backend quality-based decompose rewards (UserFragmentService). */
export function estimateDecomposeFragments(qualityType?: string | null, productPrice?: number | null): number {
  const tier = normalizeQualityTier(qualityType ?? undefined);
  let byQuality = 8;
  if (tier === "RARE") byQuality = 15;
  else if (tier === "EPIC") byQuality = 25;
  else if (tier === "LEGENDARY" || tier === "LEGEND") byQuality = 50;

  if (productPrice != null && productPrice > 0) {
    const byPrice = Math.max(5, Math.min(80, Math.floor(productPrice / 10)));
    return Math.max(byQuality, byPrice);
  }
  return byQuality;
}

/** Estimate balance recovery when product price is unknown (display-only hint). */
export function estimateRedeemBalance(productPrice?: number | null, qualityType?: string | null): number | null {
  if (productPrice != null && productPrice > 0) {
    return Math.max(1, Math.round(productPrice * REDEEM_RATE * 100) / 100);
  }
  const tier = normalizeQualityTier(qualityType ?? undefined);
  const referencePrice =
    tier === "LEGENDARY" || tier === "LEGEND" ? 199 : tier === "EPIC" ? 79 : tier === "RARE" ? 39 : 15;
  return Math.max(1, Math.round(referencePrice * REDEEM_RATE * 100) / 100);
}

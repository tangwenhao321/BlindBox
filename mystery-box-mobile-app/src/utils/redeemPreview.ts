import { normalizeQualityTier } from "./quality";
import { getAppCurrency } from "./formatCurrency";

const REDEEM_RATE = 0.35;

function roundMoneyHint(amount: number): number {
  return getAppCurrency() === "VND" ? Math.round(amount) : Math.round(amount * 100) / 100;
}

function decomposePriceDivisor(): number {
  return getAppCurrency() === "VND" ? 10_000 : 10;
}

function referenceTierPrice(qualityType?: string | null): number {
  const tier = normalizeQualityTier(qualityType ?? undefined);
  const vnd = getAppCurrency() === "VND";
  if (tier === "LEGENDARY" || tier === "LEGEND") return vnd ? 199_000 : 199;
  if (tier === "EPIC") return vnd ? 79_000 : 79;
  if (tier === "RARE") return vnd ? 39_000 : 39;
  return vnd ? 15_000 : 15;
}

/** Mirror backend quality-based decompose rewards (UserFragmentService). */
export function estimateDecomposeFragments(qualityType?: string | null, productPrice?: number | null): number {
  const tier = normalizeQualityTier(qualityType ?? undefined);
  let byQuality = 8;
  if (tier === "RARE") byQuality = 15;
  else if (tier === "EPIC") byQuality = 25;
  else if (tier === "LEGENDARY" || tier === "LEGEND") byQuality = 50;

  if (productPrice != null && productPrice > 0) {
    const byPrice = Math.max(5, Math.min(80, Math.floor(productPrice / decomposePriceDivisor())));
    return Math.max(byQuality, byPrice);
  }
  return byQuality;
}

/** Estimate balance recovery when product price is unknown (display-only hint). */
export function estimateRedeemBalance(productPrice?: number | null, qualityType?: string | null): number | null {
  if (productPrice != null && productPrice > 0) {
    return Math.max(1, roundMoneyHint(productPrice * REDEEM_RATE));
  }
  return Math.max(1, roundMoneyHint(referenceTierPrice(qualityType) * REDEEM_RATE));
}

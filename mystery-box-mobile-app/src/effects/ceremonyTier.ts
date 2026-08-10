import type { Product } from "../types";
import { resolvePrizeTier } from "./config";

/** 揭晓仪式档位（参考王者珍品传说 / 无双 / 珍品无双分层） */
export type CeremonyTier = "GENERAL" | "HIDDEN" | "TREASURE_LEGEND" | "PEERLESS" | "TREASURE_PEERLESS";

/** @deprecated 兼容旧 LEGENDARY 特效键 */
export type PrizeTier = CeremonyTier | "LEGENDARY";

const PEERLESS_PRICE_MIN = 168;
const TREASURE_PEERLESS_PRICE_MIN = 328;

export function normalizeCeremonyTier(tier: string | undefined): CeremonyTier {
  const key = (tier ?? "GENERAL").toUpperCase();
  if (key === "LEGENDARY" || key === "TREASURE_LEGEND") return "TREASURE_LEGEND";
  if (key === "PEERLESS") return "PEERLESS";
  if (key === "TREASURE_PEERLESS") return "TREASURE_PEERLESS";
  if (key === "HIDDEN" || key === "EPIC") return "HIDDEN";
  return "GENERAL";
}

export function ceremonyTierRank(tier: CeremonyTier): number {
  if (tier === "TREASURE_PEERLESS") return 0;
  if (tier === "PEERLESS") return 1;
  if (tier === "TREASURE_LEGEND") return 2;
  if (tier === "HIDDEN") return 3;
  return 4;
}

/** 根据商品品质与售价推断揭晓仪式档位（无需后端改枚举） */
export function resolveCeremonyTier(product: Product, drawProducts?: Product[]): CeremonyTier {
  const base = resolvePrizeTier(product.qualityType);
  if (base === "GENERAL") return "GENERAL";
  if (base === "HIDDEN") return "HIDDEN";

  const price = product.price ?? 0;
  const legendPool = (drawProducts ?? [product]).filter((p) => resolvePrizeTier(p.qualityType) === "LEGENDARY");
  const topLegendPrice = legendPool.reduce((max, p) => Math.max(max, p.price ?? 0), 0);
  const isTopLegend = legendPool.length <= 1 || price >= topLegendPrice;

  if (price >= TREASURE_PEERLESS_PRICE_MIN) return "TREASURE_PEERLESS";
  if (isTopLegend && price >= PEERLESS_PRICE_MIN) return "PEERLESS";
  return "TREASURE_LEGEND";
}

export function resolveHighestCeremonyTier(products: Product[]): CeremonyTier {
  if (products.length === 0) return "GENERAL";
  const tiers = products.map((p) => resolveCeremonyTier(p, products));
  return tiers.reduce(
    (best, t) => (ceremonyTierRank(t) < ceremonyTierRank(best) ? t : best),
    tiers[0] ?? "GENERAL",
  );
}

export function isPremiumCeremony(tier: CeremonyTier): boolean {
  return tier === "TREASURE_LEGEND" || tier === "PEERLESS" || tier === "TREASURE_PEERLESS";
}

export function isUltimateCeremony(tier: CeremonyTier): boolean {
  return tier === "PEERLESS" || tier === "TREASURE_PEERLESS";
}

/** 对外展示仍用 GENERAL / HIDDEN / LEGENDARY 三档品质文案 */
export function ceremonyTierToDisplayQuality(tier: CeremonyTier): "GENERAL" | "HIDDEN" | "LEGENDARY" {
  if (tier === "HIDDEN") return "HIDDEN";
  if (isPremiumCeremony(tier)) return "LEGENDARY";
  return "GENERAL";
}

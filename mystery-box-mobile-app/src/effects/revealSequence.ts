import type { Product } from "../types";
import {
  ceremonyTierRank,
  resolveCeremonyTier,
  type CeremonyTier,
} from "./ceremonyTier";
import { resolvePrizeTier } from "./config";

export type RevealPacing = "normal" | "fast" | "finale" | "ceremony";

/** 连抽：普通款先揭晓，最高仪式档位压轴 */
export function sortRevealSequence(products: Product[]): Product[] {
  if (products.length <= 1) return [...products];
  const indexed = products.map((p, index) => ({ p, index }));
  let finaleIdx = 0;
  let bestRank = 99;
  indexed.forEach((row, i) => {
    const rank = ceremonyTierRank(resolveCeremonyTier(row.p, products));
    if (rank < bestRank || (rank === bestRank && row.index > indexed[finaleIdx].index)) {
      bestRank = rank;
      finaleIdx = i;
    }
  });
  const finale = indexed[finaleIdx].p;
  const rest = indexed.filter((_, i) => i !== finaleIdx).sort((a, b) => a.index - b.index).map((r) => r.p);
  return [...rest, finale];
}

export function countRevealRarity(products: Product[]) {
  let treasureLegend = 0;
  let peerless = 0;
  let treasurePeerless = 0;
  let hidden = 0;
  for (const p of products) {
    const ceremony = resolveCeremonyTier(p, products);
    if (ceremony === "TREASURE_PEERLESS") treasurePeerless += 1;
    else if (ceremony === "PEERLESS") peerless += 1;
    else if (ceremony === "TREASURE_LEGEND") treasureLegend += 1;
    else if (ceremony === "HIDDEN") hidden += 1;
  }
  const legendary = treasureLegend + peerless + treasurePeerless;
  return {
    total: products.length,
    hidden,
    legendary,
    treasureLegend,
    peerless,
    treasurePeerless,
  };
}

/** @deprecated 用于旧排序逻辑 */
export function tierRankFromQuality(_qualityType?: string): number {
  return 4;
}

export { resolvePrizeTier };

export { resolveRevealPacing, resolveChainRevealDelayMs, shouldPlayBoxTeaser, isFinaleTeaser } from "./revealSequenceEngine";
export { scheduleChainedRevealTrigger } from "./revealChainAdvance";

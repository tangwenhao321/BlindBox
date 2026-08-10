import type { Product } from "../types";
import { resolveCeremonyTier } from "../effects/ceremonyTier";
import type { RevealReplayPreference } from "./revealSettings";

/** Indices into sorted reveal sequence for manual replay (respects user replay preference). */
export function buildReplayPlaylistIndices(
  sortedPrizes: Product[],
  pref: RevealReplayPreference,
  markerIndices?: number[],
): number[] {
  if (sortedPrizes.length === 0) return [];
  if (pref === "finale") return [sortedPrizes.length - 1];
  if (pref === "highlights") {
    if (markerIndices?.length) {
      const unique = [...new Set(markerIndices)].filter((i) => i >= 0 && i < sortedPrizes.length);
      if (unique.length) return unique.sort((a, b) => a - b);
    }
    const rows = sortedPrizes
      .map((p, i) => ({ i, tier: resolveCeremonyTier(p, sortedPrizes) }))
      .filter((row) => row.tier !== "GENERAL")
      .map((row) => row.i);
    return rows.length > 0 ? rows : [sortedPrizes.length - 1];
  }
  return sortedPrizes.map((_, i) => i);
}

export function nextReplayPlaylistIndex(indices: number[], current: number): number | null {
  const pos = indices.indexOf(current);
  if (pos < 0 || pos >= indices.length - 1) return null;
  return indices[pos + 1] ?? null;
}

export type PrizeDuplicateMeta = {
  duplicateIndex?: number;
  duplicateCount?: number;
};

export function computePrizeDuplicateMeta(products: Product[]): PrizeDuplicateMeta[] {
  const countById = new Map<string, number>();
  for (const p of products) {
    countById.set(p.id, (countById.get(p.id) ?? 0) + 1);
  }
  const seen = new Map<string, number>();
  return products.map((p) => {
    const duplicateCount = countById.get(p.id) ?? 1;
    if (duplicateCount <= 1) return {};
    const duplicateIndex = (seen.get(p.id) ?? 0) + 1;
    seen.set(p.id, duplicateIndex);
    return { duplicateIndex, duplicateCount };
  });
}

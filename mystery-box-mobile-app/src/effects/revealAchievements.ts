import type { Product } from "../types";
import { resolveCeremonyTier } from "./ceremonyTier";
import { getRevealRemoteConfig } from "./revealRemote";

export type RevealAchievementKind =
  | "first_hidden"
  | "multi_rare_order"
  | "series_half"
  | "series_complete";

export type RevealAchievement = {
  kind: RevealAchievementKind;
  titleKey: string;
  bodyKey: string;
};

export function evaluateRevealAchievements(input: {
  products: Product[];
  allProducts: Product[];
  seriesCollected?: number;
  seriesTotal?: number;
}): RevealAchievement[] {
  if (!getRevealRemoteConfig().achievementHintsEnabled) return [];
  const out: RevealAchievement[] = [];
  const rareCount = input.products.filter((p) => {
    const tier = resolveCeremonyTier(p, input.allProducts);
    return tier !== "GENERAL";
  }).length;
  if (rareCount >= 2) {
    out.push({
      kind: "multi_rare_order",
      titleKey: "achievements.multiRareTitle",
      bodyKey: "achievements.multiRareBody",
    });
  }
  const hasHidden = input.products.some(
    (p) => resolveCeremonyTier(p, input.allProducts) === "HIDDEN",
  );
  if (hasHidden) {
    out.push({ kind: "first_hidden", titleKey: "achievements.firstHiddenTitle", bodyKey: "achievements.firstHiddenBody" });
  }
  if (input.seriesTotal && input.seriesCollected != null) {
    if (input.seriesCollected >= input.seriesTotal) {
      out.push({
        kind: "series_complete",
        titleKey: "achievements.seriesCompleteTitle",
        bodyKey: "achievements.seriesCompleteBody",
      });
    } else if (input.seriesCollected >= Math.ceil(input.seriesTotal / 2)) {
      out.push({
        kind: "series_half",
        titleKey: "achievements.seriesHalfTitle",
        bodyKey: "achievements.seriesHalfBody",
      });
    }
  }
  return out;
}

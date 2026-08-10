import type { TFunction } from "i18next";
import type { PrizeTier } from "../effects/config";
import { ceremonyTierToDisplayQuality, normalizeCeremonyTier } from "../effects/ceremonyTier";

type DisplayTier = "GENERAL" | "HIDDEN" | "LEGENDARY";

function displayTierKey(tier: PrizeTier): DisplayTier {
  return ceremonyTierToDisplayQuality(normalizeCeremonyTier(tier));
}

export function effectProfileTitle(t: TFunction, tier: PrizeTier) {
  return t(`effectProfile.${displayTierKey(tier)}.title`);
}

export function effectProfileTierLabel(t: TFunction, tier: PrizeTier) {
  return t(`effectProfile.${displayTierKey(tier)}.tierLabel`);
}

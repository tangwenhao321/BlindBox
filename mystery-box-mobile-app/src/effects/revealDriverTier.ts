import { resetRevealPerformanceSession } from "./sessionPerf";

export type RevealDriverTier = "reanimated" | "simple" | "static";

let driverTier: RevealDriverTier = "reanimated";

export function getRevealDriverTier(): RevealDriverTier {
  return driverTier;
}

export function setRevealDriverTier(tier: RevealDriverTier): void {
  driverTier = tier;
}

export function degradeRevealDriverTier(): RevealDriverTier {
  if (driverTier === "reanimated") {
    driverTier = "simple";
  } else if (driverTier === "simple") {
    driverTier = "static";
  }
  return driverTier;
}

export function resetRevealDriverTierForTests(): void {
  driverTier = "reanimated";
}

/** Reset degraded tier before a paid reveal so paid draws use full motion (not stuck on static). */
export function resetRevealDriverTierForPaidReveal(): void {
  resetRevealPerformanceSession();
  driverTier = "reanimated";
}

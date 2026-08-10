import type { SharedValue } from "react-native-reanimated";
import { isPremiumCeremony, isUltimateCeremony, normalizeCeremonyTier, type CeremonyTier } from "./ceremonyTier";
import type { RevealPacing } from "./revealSequence";
import { resolveSkipGuardTier, type SkipGuardTier } from "./revealSkipPolicy";

export type RevealTouchPhase = "precharge" | "guarded" | "normal";

/** Flip + burst window uses corner-only skip; teaser/charge uses full-screen skip. */
export function resolveRevealTouchPhase(
  cardFlip: number,
  guardTier: SkipGuardTier,
  flashOpacity = 0,
): RevealTouchPhase {
  "worklet";
  if (guardTier === "normal") return "precharge";
  const inFlipWindow = cardFlip > 0.1 && cardFlip < 0.88;
  const inBurstWindow = flashOpacity > 0.35 && cardFlip >= 0.55;
  if (inFlipWindow || inBurstWindow) return "guarded";
  if (cardFlip >= 0.88) return "normal";
  return "precharge";
}

export function isFullScreenSkipAllowed(phase: RevealTouchPhase): boolean {
  return phase === "precharge" || phase === "normal";
}

export function resolveTouchGuardTier(
  tier: CeremonyTier | string | undefined,
  pacing: RevealPacing,
): SkipGuardTier {
  return resolveSkipGuardTier(tier as CeremonyTier | undefined, pacing);
}

export function shouldShowRareWatermark(tier: CeremonyTier | string | undefined): boolean {
  const normalized = typeof tier === "string" ? normalizeCeremonyTier(tier) : tier;
  if (!normalized) return false;
  return isUltimateCeremony(normalized) || isPremiumCeremony(normalized) || normalized === "HIDDEN";
}

export function readCardFlip(cardFlip?: SharedValue<number>): number {
  return cardFlip?.value ?? 0;
}

export function readFlashOpacity(flashOpacity?: SharedValue<number>): number {
  return flashOpacity?.value ?? 0;
}

export function resolveAccelerateSpeedLabel(
  isAccelerating: boolean,
  progress: number,
  accelTier: 0 | 1 | 2,
): "1.5x" | "2.5x" | null {
  if (!isAccelerating && accelTier === 0) return null;
  if (accelTier === 2 || progress >= 0.92) return "2.5x";
  if (isAccelerating || accelTier === 1) return "1.5x";
  return null;
}

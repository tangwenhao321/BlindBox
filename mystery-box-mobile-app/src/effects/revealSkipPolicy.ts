import type { CeremonyTier } from "./ceremonyTier";
import { isUltimateCeremony } from "./ceremonyTier";
import type { RevealPacing } from "./revealSequence";

export type SkipGuardTier = "normal" | "guarded";

export function resolveSkipGuardTier(
  ceremonyTier: CeremonyTier | undefined,
  pacing: RevealPacing,
): SkipGuardTier {
  if (!ceremonyTier) return "normal";
  if (isUltimateCeremony(ceremonyTier)) return "guarded";
  if (pacing === "finale" || pacing === "ceremony") return "guarded";
  return "normal";
}

export type SkipTapResult =
  | { action: "skip" }
  | { action: "pause" }
  | { action: "noop" };

export function resolveSkipTapAction(
  guardTier: SkipGuardTier,
  isPaused: boolean,
  isLongPress: boolean,
  consecutiveTaps: number,
): SkipTapResult {
  if (guardTier === "normal" || isLongPress || consecutiveTaps >= 2) {
    return { action: "skip" };
  }
  if (isPaused) {
    return { action: "skip" };
  }
  return { action: "pause" };
}

export type AccelerateTier = 0 | 1 | 2;

export function resolveAccelerateTier(isLongPress: boolean): AccelerateTier {
  return isLongPress ? 2 : 1;
}

export function accelerateDurationScale(tier: AccelerateTier): number {
  if (tier === 2) return 0.4;
  if (tier === 1) return 0.67;
  return 1;
}

export function resolveRevealBreathPeriodMs(tier: string | undefined): number {
  switch (tier) {
    case "PEERLESS":
    case "TREASURE_PEERLESS":
      return 420;
    case "TREASURE_LEGEND":
      return 560;
    case "HIDDEN":
      return 680;
    default:
      return 900;
  }
}

export function scaleBreathDurationMs(ms: number, accelerateTier: 0 | 1 | 2): number {
  if (accelerateTier === 2) return Math.round(ms * 0.4);
  if (accelerateTier === 1) return Math.round(ms * 0.67);
  return ms;
}

export function acceleratePlaybackRate(tier: AccelerateTier, baseRate = 1): number {
  if (tier === 2) return baseRate * 2.5;
  if (tier === 1) return baseRate * 1.5;
  return baseRate;
}

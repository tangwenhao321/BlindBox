import type { EffectProfile, PrizeTier } from "./config";
import { getEffectProfile } from "./config";
import { isUltimateCeremony, normalizeCeremonyTier } from "./ceremonyTier";

/** 连抽时逐件加强特效（行业常见：越往后越燃） */
export function getEffectProfileWithBoost(
  tier: PrizeTier,
  revealIndex: number,
  totalReveals: number,
  opts?: { reduceMotion?: boolean; lowPerf?: boolean },
): EffectProfile {
  const base = getEffectProfile(tier, opts);
  if (totalReveals <= 1 || revealIndex <= 0) return base;

  const ceremony = normalizeCeremonyTier(tier);
  const progress = revealIndex / Math.max(totalReveals - 1, 1);
  const boost = 1 + progress * (isUltimateCeremony(ceremony) ? 0.55 : 0.45);

  return {
    ...base,
    particleCount: Math.min(96, Math.round(base.particleCount * boost)),
    confettiCount: Math.min(48, Math.round(base.confettiCount * (1 + progress * 0.35))),
    rayCount: base.rayCount + Math.round(progress * 4),
    flashPeak: Math.min(1, base.flashPeak + progress * 0.12),
    pulseScale: base.pulseScale + progress * 0.06,
    revealDelayMs: Math.round(base.revealDelayMs * (0.92 + progress * 0.25)),
    vibrationPattern:
      progress > 0.6
        ? [...base.vibrationPattern, 0, 30, 0, 40]
        : base.vibrationPattern,
  };
}

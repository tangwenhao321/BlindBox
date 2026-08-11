import type { CeremonyTier, PrizeTier } from "./ceremonyTier";
import { normalizeCeremonyTier } from "./ceremonyTier";

export type { CeremonyTier, PrizeTier } from "./ceremonyTier";

export type EffectProfile = {
  tier: CeremonyTier;
  title: string;
  tierLabel: string;
  glowColor: string;
  sparkleColor: string;
  pulseScale: number;
  dimColor: string;
  centerGlow: string;
  rimColor: string;
  vibrationPattern: number[];
  particleCount: number;
  confettiCount: number;
  rayCount: number;
  flashPeak: number;
  revealDelayMs: number;
  /** 揭晓前蓄力阶段（王者式 suspense） */
  chargeMs: number;
};

const BASE: Record<CeremonyTier, EffectProfile> = {
  GENERAL: {
    tier: "GENERAL",
    title: "",
    tierLabel: "",
    glowColor: "rgba(64, 145, 255, 0.55)",
    sparkleColor: "rgba(180, 220, 255, 1)",
    pulseScale: 1.06,
    dimColor: "rgba(6, 12, 28, 0.78)",
    centerGlow: "rgba(74, 144, 255, 0.45)",
    rimColor: "rgba(120, 180, 255, 0.35)",
    vibrationPattern: [0, 40, 30, 50],
    particleCount: 36,
    confettiCount: 16,
    rayCount: 4,
    flashPeak: 0.55,
    revealDelayMs: 1400,
    chargeMs: 0,
  },
  HIDDEN: {
    tier: "HIDDEN",
    title: "",
    tierLabel: "",
    glowColor: "rgba(179, 73, 255, 0.62)",
    sparkleColor: "rgba(230, 190, 255, 1)",
    pulseScale: 1.1,
    dimColor: "rgba(18, 6, 32, 0.84)",
    centerGlow: "rgba(161, 86, 255, 0.52)",
    rimColor: "rgba(200, 130, 255, 0.45)",
    vibrationPattern: [0, 50, 35, 75, 25, 60],
    particleCount: 48,
    confettiCount: 24,
    rayCount: 8,
    flashPeak: 0.72,
    revealDelayMs: 2200,
    chargeMs: 480,
  },
  TREASURE_LEGEND: {
    tier: "TREASURE_LEGEND",
    title: "",
    tierLabel: "",
    glowColor: "rgba(255, 200, 80, 0.75)",
    sparkleColor: "rgba(255, 245, 200, 1)",
    pulseScale: 1.14,
    dimColor: "rgba(20, 12, 0, 0.88)",
    centerGlow: "rgba(255, 185, 50, 0.58)",
    rimColor: "rgba(255, 215, 120, 0.55)",
    vibrationPattern: [0, 60, 40, 85, 30, 95],
    particleCount: 72,
    confettiCount: 40,
    rayCount: 14,
    flashPeak: 0.88,
    revealDelayMs: 3600,
    chargeMs: 720,
  },
  PEERLESS: {
    tier: "PEERLESS",
    title: "",
    tierLabel: "",
    glowColor: "rgba(255, 90, 60, 0.78)",
    sparkleColor: "rgba(255, 220, 180, 1)",
    pulseScale: 1.18,
    dimColor: "rgba(32, 4, 4, 0.9)",
    centerGlow: "rgba(255, 120, 40, 0.62)",
    rimColor: "rgba(255, 180, 80, 0.65)",
    vibrationPattern: [0, 70, 45, 100, 35, 115, 25, 80],
    particleCount: 88,
    confettiCount: 48,
    rayCount: 18,
    flashPeak: 0.94,
    revealDelayMs: 4400,
    chargeMs: 980,
  },
  TREASURE_PEERLESS: {
    tier: "TREASURE_PEERLESS",
    title: "",
    tierLabel: "",
    glowColor: "rgba(255, 160, 255, 0.82)",
    sparkleColor: "rgba(255, 250, 220, 1)",
    pulseScale: 1.22,
    dimColor: "rgba(24, 8, 32, 0.92)",
    centerGlow: "rgba(255, 140, 220, 0.68)",
    rimColor: "rgba(255, 210, 140, 0.72)",
    vibrationPattern: [0, 75, 50, 110, 40, 125, 30, 90, 20, 70],
    particleCount: 104,
    confettiCount: 56,
    rayCount: 22,
    flashPeak: 1,
    revealDelayMs: 5200,
    chargeMs: 1200,
  },
};

export function resolvePrizeTier(qualityType?: string): "GENERAL" | "HIDDEN" | "LEGENDARY" {
  const normalized = (qualityType ?? "GENERAL").toUpperCase();
  if (normalized === "LEGENDARY" || normalized === "LEGEND") return "LEGENDARY";
  if (normalized === "HIDDEN" || normalized === "EPIC") return "HIDDEN";
  return "GENERAL";
}

export function resolveHighestTier(types: Array<string | undefined>): PrizeTier {
  const tiers = types.map(resolvePrizeTier);
  if (tiers.includes("LEGENDARY")) return "TREASURE_LEGEND";
  if (tiers.includes("HIDDEN")) return "HIDDEN";
  return "GENERAL";
}

export function getEffectProfile(tier: PrizeTier, opts?: { reduceMotion?: boolean; lowPerf?: boolean }): EffectProfile {
  const normalized = normalizeCeremonyTier(tier);
  const base = BASE[normalized];
  if (!opts?.reduceMotion && !opts?.lowPerf) return base;
  const reducedParticles = opts.reduceMotion ? 0 : Math.max(8, Math.floor(base.particleCount / 2));
  const reducedConfetti = opts.reduceMotion ? 0 : Math.max(4, Math.floor(base.confettiCount / 2));
  return {
    ...base,
    pulseScale: opts.reduceMotion ? 1.01 : Math.min(base.pulseScale, 1.1),
    particleCount: reducedParticles,
    confettiCount: reducedConfetti,
    rayCount: opts.reduceMotion ? 0 : Math.max(0, Math.floor(base.rayCount / 2)),
    flashPeak: opts.reduceMotion ? 0.25 : base.flashPeak * 0.7,
    revealDelayMs: opts.reduceMotion ? 280 : Math.min(base.revealDelayMs, 900),
    chargeMs: opts.reduceMotion ? 0 : Math.min(base.chargeMs, 400),
    vibrationPattern: opts.reduceMotion ? [0, 25] : base.vibrationPattern,
  };
}

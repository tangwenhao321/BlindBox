import type { ParticleShape } from "./burstParticles";
import type { AtmosphereProfile } from "./revealAtmosphereWorkshop";
import type { RevealSoundPack } from "../utils/revealSettings";

export type AtmosphereRevealOverrides = {
  soundPackId?: string;
  skipParticles?: boolean;
  particleScale?: number;
  /** Same mapping as applyMonthlyParticleBias: ribbon→shard, dust→dot, sparkle→star. */
  particleBias?: ParticleShape | "mixed";
  /** Accent + strength for lustre / flash tint (warm|cool); omit for neutral. */
  lustreTintAccent?: string;
  lustreTintStrength?: number;
};

const SOUND_PACK_MAP: Record<string, string> = {
  standard: "classic",
  classic: "classic",
  arcade: "neon",
  soft: "minimal",
  minimal: "minimal",
};

const LIGHT_TINT: Record<string, { accent: string; strength: number }> = {
  warm: { accent: "#FB923C", strength: 0.24 },
  cool: { accent: "#38BDF8", strength: 0.24 },
};

/**
 * Map workshop particle styles to bias — mirrors applyMonthlyParticleBias
 * (ribbon→shard, dust→dot, sparkle/default→star).
 */
export function resolveAtmosphereParticleBias(particleStyle: string): ParticleShape | "mixed" {
  const style = particleStyle.trim().toLowerCase();
  if (style === "ribbon" || style === "dense") return "shard";
  if (style === "dust" || style === "subtle") return "dot";
  if (style === "none") return "mixed";
  return "star";
}

export function resolveAtmosphereParticleScale(particleStyle: string): number {
  const style = particleStyle.trim().toLowerCase();
  if (style === "none") return 0;
  if (style === "dense" || style === "ribbon") return 1.15;
  if (style === "subtle" || style === "dust") return 0.75;
  return 1;
}

export function resolveAtmosphereRevealOverrides(profile: AtmosphereProfile): AtmosphereRevealOverrides {
  const soundPackId = SOUND_PACK_MAP[profile.soundPack] ?? profile.soundPack;
  const skipParticles = profile.particleStyle === "none";
  const particleScale = resolveAtmosphereParticleScale(profile.particleStyle);
  const particleBias = resolveAtmosphereParticleBias(profile.particleStyle);
  const light = LIGHT_TINT[profile.lightStyle.trim().toLowerCase()];
  return {
    soundPackId,
    skipParticles,
    particleScale: skipParticles ? 0 : particleScale,
    particleBias,
    lustreTintAccent: light?.accent,
    lustreTintStrength: light?.strength,
  };
}

export function resolveAtmosphereSoundPack(soundPackId?: string): RevealSoundPack | null {
  if (!soundPackId) return null;
  if (soundPackId === "classic" || soundPackId === "cute" || soundPackId === "neon" || soundPackId === "minimal") {
    return soundPackId;
  }
  if (soundPackId === "arcade") return "neon";
  if (soundPackId === "standard") return "classic";
  if (soundPackId === "soft") return "minimal";
  return null;
}

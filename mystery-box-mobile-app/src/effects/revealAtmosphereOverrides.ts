import type { AtmosphereProfile } from "./revealAtmosphereWorkshop";
import type { RevealSoundPack } from "../utils/revealSettings";

export type AtmosphereRevealOverrides = {
  soundPackId?: string;
  skipParticles?: boolean;
  particleScale?: number;
};

const SOUND_PACK_MAP: Record<string, string> = {
  standard: "classic",
  classic: "classic",
  arcade: "neon",
  minimal: "minimal",
};

export function resolveAtmosphereRevealOverrides(profile: AtmosphereProfile): AtmosphereRevealOverrides {
  const soundPackId = SOUND_PACK_MAP[profile.soundPack] ?? profile.soundPack;
  const skipParticles = profile.particleStyle === "none";
  const particleScale =
    profile.particleStyle === "dense" ? 1.15 : profile.particleStyle === "subtle" ? 0.75 : 1;
  return { soundPackId, skipParticles, particleScale };
}

export function resolveAtmosphereSoundPack(soundPackId?: string): RevealSoundPack | null {
  if (!soundPackId) return null;
  if (soundPackId === "classic" || soundPackId === "cute" || soundPackId === "neon" || soundPackId === "minimal") {
    return soundPackId;
  }
  if (soundPackId === "arcade") return "neon";
  if (soundPackId === "standard") return "classic";
  return null;
}

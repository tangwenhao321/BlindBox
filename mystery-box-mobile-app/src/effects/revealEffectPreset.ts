import type { RevealEffectPresetId } from "../utils/revealSettings";

export type RevealEffectPreset = {
  id: RevealEffectPresetId;
  lustrePaletteId?: string;
  particleScale: number;
  flashScale: number;
  borderAccent: string;
};

const PRESETS: Record<RevealEffectPresetId, RevealEffectPreset> = {
  default: { id: "default", particleScale: 1, flashScale: 1, borderAccent: "#ffd56a" },
  neon: { id: "neon", lustrePaletteId: "neon", particleScale: 1.12, flashScale: 1.08, borderAccent: "#7cf5ff" },
  warm: { id: "warm", lustrePaletteId: "warm", particleScale: 0.95, flashScale: 0.92, borderAccent: "#ffb36b" },
};

export function resolveRevealEffectPreset(id: RevealEffectPresetId): RevealEffectPreset {
  return PRESETS[id] ?? PRESETS.default;
}

export function applyEffectPresetToFlags(
  preset: RevealEffectPreset,
  tierFlags?: Record<string, boolean>,
): Record<string, boolean> {
  if (!tierFlags) return { particles: preset.particleScale > 0.5, flash: preset.flashScale > 0.5 };
  return {
    ...tierFlags,
    particles: tierFlags.particles !== false && preset.particleScale > 0.5,
    flash: tierFlags.flash !== false && preset.flashScale > 0.5,
  };
}

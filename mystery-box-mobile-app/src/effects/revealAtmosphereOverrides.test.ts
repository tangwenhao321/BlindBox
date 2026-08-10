import { describe, expect, it } from "vitest";
import { resolveAtmosphereRevealOverrides, resolveAtmosphereSoundPack } from "./revealAtmosphereOverrides";

describe("revealAtmosphereOverrides", () => {
  it("maps dense particles and arcade sound", () => {
    const overrides = resolveAtmosphereRevealOverrides({
      boxStyle: "default",
      soundPack: "arcade",
      particleStyle: "dense",
      lightStyle: "warm",
      borderStyle: "gold",
      hapticRhythm: "balanced",
    });
    expect(overrides.skipParticles).toBe(false);
    expect(overrides.particleScale).toBe(1.15);
    expect(resolveAtmosphereSoundPack(overrides.soundPackId)).toBe("neon");
  });

  it("disables particles for none style", () => {
    const overrides = resolveAtmosphereRevealOverrides({
      boxStyle: "default",
      soundPack: "minimal",
      particleStyle: "none",
      lightStyle: "cool",
      borderStyle: "gold",
      hapticRhythm: "balanced",
    });
    expect(overrides.skipParticles).toBe(true);
    expect(resolveAtmosphereSoundPack(overrides.soundPackId)).toBe("minimal");
  });
});

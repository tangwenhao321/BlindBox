import { describe, expect, it } from "vitest";
import {
  resolveAtmosphereParticleBias,
  resolveAtmosphereParticleScale,
  resolveAtmosphereRevealOverrides,
  resolveAtmosphereSoundPack,
} from "./revealAtmosphereOverrides";

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
    expect(overrides.particleBias).toBe("shard");
    expect(overrides.lustreTintAccent).toBe("#FB923C");
    expect(resolveAtmosphereSoundPack(overrides.soundPackId)).toBe("neon");
  });

  it("maps sparkle|dust|ribbon like applyMonthlyParticleBias", () => {
    expect(resolveAtmosphereParticleBias("sparkle")).toBe("star");
    expect(resolveAtmosphereParticleBias("dust")).toBe("dot");
    expect(resolveAtmosphereParticleBias("ribbon")).toBe("shard");
    expect(resolveAtmosphereParticleScale("dust")).toBe(0.75);
    expect(resolveAtmosphereParticleScale("ribbon")).toBe(1.15);
    expect(resolveAtmosphereParticleScale("sparkle")).toBe(1);
  });

  it("maps lightStyle warm|cool|neutral to lustre tint", () => {
    const warm = resolveAtmosphereRevealOverrides({
      boxStyle: "default",
      soundPack: "standard",
      particleStyle: "sparkle",
      lightStyle: "warm",
      borderStyle: "gold",
      hapticRhythm: "balanced",
    });
    expect(warm.lustreTintAccent).toBe("#FB923C");
    expect(warm.lustreTintStrength).toBeGreaterThan(0);

    const cool = resolveAtmosphereRevealOverrides({
      boxStyle: "default",
      soundPack: "standard",
      particleStyle: "sparkle",
      lightStyle: "cool",
      borderStyle: "gold",
      hapticRhythm: "balanced",
    });
    expect(cool.lustreTintAccent).toBe("#38BDF8");

    const neutral = resolveAtmosphereRevealOverrides({
      boxStyle: "default",
      soundPack: "standard",
      particleStyle: "sparkle",
      lightStyle: "neutral",
      borderStyle: "gold",
      hapticRhythm: "balanced",
    });
    expect(neutral.lustreTintAccent).toBeUndefined();
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
    expect(overrides.particleScale).toBe(0);
    expect(resolveAtmosphereSoundPack(overrides.soundPackId)).toBe("minimal");
  });
});

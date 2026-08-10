import { describe, expect, it } from "vitest";
import { getEffectProfile } from "./config";
import {
  applyRemoteRevealProfile,
  getRevealRemoteConfig,
  parseLustreBoxOverrides,
  resolveLustreIntensity,
  resolveLustrePaletteIdForBox,
  setRevealRemoteConfig,
} from "./revealRemote";

describe("revealRemote", () => {
  it("scales particles and confetti from remote config", () => {
    setRevealRemoteConfig({ particleScale: 2, confettiScale: 0.5, delayMsOverride: 900 });
    const base = getEffectProfile("TREASURE_LEGEND");
    const scaled = applyRemoteRevealProfile(base);
    expect(scaled.particleCount).toBeGreaterThan(base.particleCount);
    expect(scaled.confettiCount).toBeLessThanOrEqual(base.confettiCount);
    expect(scaled.revealDelayMs).toBe(900);
    setRevealRemoteConfig(null);
    expect(getRevealRemoteConfig().particleScale).toBe(1);
  });

  it("scales charge and flash intensity", () => {
    setRevealRemoteConfig({ chargeScale: 1.5, flashScale: 1.2 });
    const base = getEffectProfile("PEERLESS");
    const scaled = applyRemoteRevealProfile(base);
    expect(scaled.chargeMs).toBeGreaterThan(base.chargeMs);
    expect(scaled.flashPeak).toBeGreaterThan(base.flashPeak);
    expect(getRevealRemoteConfig().feedTickerEnabled).toBe(true);
    setRevealRemoteConfig(null);
  });

  it("scales lustre intensity multiplier", () => {
    setRevealRemoteConfig({ lustreScale: 1.5 });
    expect(getRevealRemoteConfig().lustreScale).toBe(1.5);
    expect(resolveLustreIntensity(0.8, { lowPerf: false })).toBe(1);
    setRevealRemoteConfig({ lustreScale: 0.5 });
    expect(resolveLustreIntensity(0.8, { lowPerf: false })).toBe(0.4);
    expect(resolveLustreIntensity(0.8, { lowPerf: true })).toBeCloseTo(0.22);
    setRevealRemoteConfig(null);
  });

  it("parses per-box lustre palette overrides", () => {
    expect(parseLustreBoxOverrides("box-1:vivid, box-2:neon")).toEqual({
      "box-1": "vivid",
      "box-2": "neon",
    });
    setRevealRemoteConfig({ revealLustreBoxOverrides: "box-a:luxury" });
    expect(resolveLustrePaletteIdForBox("box-a")).toBe("luxury");
    expect(resolveLustrePaletteIdForBox("box-b")).toBeUndefined();
    setRevealRemoteConfig({ lustrePaletteId: "warm", revealLustreBoxOverrides: "box-b:neon" });
    expect(resolveLustrePaletteIdForBox("box-b")).toBe("neon");
    expect(resolveLustrePaletteIdForBox("box-c")).toBe("warm");
    setRevealRemoteConfig(null);
  });

  it("exposes sequence timing remote defaults", () => {
    setRevealRemoteConfig(null);
    const cfg = getRevealRemoteConfig();
    expect(cfg.interDrawDelayMs).toBe(280);
    expect(cfg.finalePauseMs).toBe(420);
    expect(cfg.finaleHoldMsExtra).toBe(300);
    expect(cfg.finaleTeaserEnabled).toBe(true);
    expect(cfg.silenceBeforeFinaleMs).toBe(220);
    expect(cfg.summaryHeroMs).toBe(1800);
    setRevealRemoteConfig({ finalePauseMs: 900, summaryHeroMs: 2400 });
    expect(getRevealRemoteConfig().finalePauseMs).toBe(900);
    setRevealRemoteConfig(null);
  });
});

import { describe, expect, it, beforeEach } from "vitest";
import {
  applyUnlockProgress,
  defaultUnlockState,
  resolveActiveRevealThemeId,
  resetThemeRotationCacheForTests,
  rollSurpriseThemeId,
  weeklyDocTheme,
} from "./revealThemeRotation";
import { setRevealRemoteConfig } from "./revealRemote";
import { setRevealNetworkRtt, setRevealNetworkTier } from "./revealNetworkTier";

describe("revealThemeRotation", () => {
  beforeEach(() => {
    resetThemeRotationCacheForTests();
    setRevealRemoteConfig(null);
    setRevealNetworkTier("wifi");
    setRevealNetworkRtt(0);
  });

  it("starts with classic + asmr unlocked", () => {
    const state = defaultUnlockState();
    expect(state.unlocked).toEqual(["classic", "asmr"]);
  });

  it("unlocks cyberpunk at 50 opens and party on first hidden", () => {
    let state = applyUnlockProgress(defaultUnlockState(), { openCount: 50 });
    expect(state.unlocked).toContain("cyberpunk");
    state = applyUnlockProgress(state, { hasHidden: true });
    expect(state.unlocked).toContain("party");
    state = applyUnlockProgress(state, { seriesComplete: true });
    expect(state.unlocked).toContain("adventure");
  });

  it("prefers limited/festival theme over equipped", () => {
    setRevealRemoteConfig({ limitedThemeId: "party", limitedThemePriority: 10, currentTheme: "cyberpunk" });
    expect(
      resolveActiveRevealThemeId({
        equippedThemeId: "asmr",
        unlocked: ["default", "cute", "neon", "luxury"],
      }),
    ).toBe("luxury");
  });

  it("uses equipped unlocked theme before weekly currentTheme", () => {
    setRevealRemoteConfig({ currentTheme: "cyberpunk", rotationCycle: 7 });
    expect(
      resolveActiveRevealThemeId({
        equippedThemeId: "asmr",
        unlocked: ["default", "cute", "neon"],
      }),
    ).toBe("cute");
  });

  it("falls back to weekly / currentTheme then default path", () => {
    setRevealRemoteConfig({ currentTheme: "adventure", rotationCycle: 7 });
    expect(resolveActiveRevealThemeId({ unlocked: ["default", "cute"] })).toBe("default");
    setRevealRemoteConfig({ rotationCycle: 7, currentTheme: undefined, themeId: undefined });
    const weekly = weeklyDocTheme(0, 7);
    expect(resolveActiveRevealThemeId({ nowMs: 0, unlocked: ["default", "cute"] })).toBe(
      weekly === "cyberpunk" ? "neon" : weekly === "asmr" ? "cute" : weekly === "party" ? "luxury" : "default",
    );
  });

  it("forces classic when RTT > 300ms", () => {
    setRevealRemoteConfig({ currentTheme: "cyberpunk" });
    setRevealNetworkRtt(420);
    expect(resolveActiveRevealThemeId({ unlocked: ["default", "cute", "neon"] })).toBe("default");
  });

  it("rolls surprise theme at configured rate", () => {
    setRevealRemoteConfig({ randomTriggerRate: 1 });
    const id = rollSurpriseThemeId(() => 0);
    expect(["default", "neon", "cute", "luxury"]).toContain(id);
    setRevealRemoteConfig({ randomTriggerRate: 0 });
    expect(rollSurpriseThemeId(() => 0.99)).toBeNull();
  });
});

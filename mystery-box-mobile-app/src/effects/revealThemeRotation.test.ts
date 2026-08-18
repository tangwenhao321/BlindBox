import { describe, expect, it, beforeEach } from "vitest";
import {
  applyUnlockProgress,
  defaultUnlockState,
  notePaidBoxOpened,
  resolveActiveRevealThemeId,
  resetThemeRotationCacheForTests,
  rollSurpriseDocTheme,
  rollSurpriseThemeId,
  weeklyDocTheme,
  effectiveUnlockedKeys,
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

  it("forces classic when RTT > 300ms and nothing is equipped", () => {
    setRevealRemoteConfig({ currentTheme: "cyberpunk" });
    setRevealNetworkRtt(420);
    expect(resolveActiveRevealThemeId({ unlocked: ["default", "cute", "neon"] })).toBe("default");
  });

  it("keeps equipped theme on weak network", () => {
    setRevealRemoteConfig({ currentTheme: "adventure" });
    setRevealNetworkRtt(420);
    expect(
      resolveActiveRevealThemeId({
        equippedThemeId: "cyberpunk",
        unlocked: ["default", "cute", "neon"],
      }),
    ).toBe("neon");
  });

  it("rolls surprise theme at configured rate", () => {
    setRevealRemoteConfig({ randomTriggerRate: 1 });
    const id = rollSurpriseThemeId(() => 0);
    expect(["default", "neon", "cute", "luxury"]).toContain(id);
    setRevealRemoteConfig({ randomTriggerRate: 0 });
    expect(rollSurpriseThemeId(() => 0.99)).toBeNull();
  });

  it("prefers unowned packs for surprise rolls", () => {
    setRevealRemoteConfig({ randomTriggerRate: 1 });
    const pick = rollSurpriseDocTheme(() => 0, 1, ["classic", "asmr"]);
    expect(pick).toBe("cyberpunk");
  });

  it("counts paid opens once per order and unlocks cyberpunk at 50", async () => {
    let last = await notePaidBoxOpened({ orderId: "o-1" });
    expect(last.isNewOpen).toBe(true);
    expect(last.state.openCount).toBe(1);
    last = await notePaidBoxOpened({ orderId: "o-1" });
    expect(last.isNewOpen).toBe(false);
    expect(last.state.openCount).toBe(1);
    for (let i = 2; i <= 50; i++) {
      last = await notePaidBoxOpened({ orderId: `o-${i}` });
    }
    expect(last.state.openCount).toBe(50);
    expect(last.state.unlocked).toContain("cyberpunk");
    expect(last.newlyUnlocked).toContain("cyberpunk");
  });

  it("keeps earned unlocks distinct from test-pack grants", () => {
    const earned = applyUnlockProgress(defaultUnlockState(), {});
    expect(earned.unlocked).toEqual(["classic", "asmr"]);
    expect(effectiveUnlockedKeys(earned, { grantTestThemes: true })).toEqual([
      "classic",
      "asmr",
      "cyberpunk",
      "party",
      "adventure",
    ]);
    expect(effectiveUnlockedKeys(earned, { grantTestThemes: false })).toEqual(["classic", "asmr"]);
  });
});

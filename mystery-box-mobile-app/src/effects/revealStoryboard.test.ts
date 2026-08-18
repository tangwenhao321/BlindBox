import { describe, expect, it, beforeEach } from "vitest";
import {
  canonicalizeStoryboardId,
  inferStoryboardFromText,
  resolveStoryboardDensity,
  shouldPlayStoryboard,
  storyboardBackdrop,
  storyboardChargeMs,
  storyboardFromCatalogKey,
  storyboardFromThemeId,
} from "./revealStoryboard";
import { resolveActiveStoryboardId, resetThemeRotationCacheForTests } from "./revealThemeRotation";
import { setRevealRemoteConfig } from "./revealRemote";
import { setRevealNetworkRtt, setRevealNetworkTier } from "./revealNetworkTier";
import { resolveRevealTheme } from "./revealTheme";

describe("revealStoryboard", () => {
  beforeEach(() => {
    resetThemeRotationCacheForTests();
    setRevealRemoteConfig(null);
    setRevealNetworkTier("wifi");
    setRevealNetworkRtt(0);
  });

  it("maps Doc2 aliases without collapsing adventure into classic", () => {
    expect(canonicalizeStoryboardId("adventure")).toBe("adventure");
    expect(canonicalizeStoryboardId("default")).toBe("classic");
    expect(canonicalizeStoryboardId("cyberpunk")).toBe("cyberpunk");
    expect(canonicalizeStoryboardId("neon")).toBe("cyberpunk");
    expect(canonicalizeStoryboardId("asmr")).toBe("asmr");
    expect(canonicalizeStoryboardId("party")).toBe("party");
  });

  it("infers storyboard from box copy", () => {
    expect(inferStoryboardFromText("Labubu cyberpunk")).toBe("cyberpunk");
    expect(inferStoryboardFromText("ASMR chữa lành")).toBe("asmr");
    expect(inferStoryboardFromText("treasure adventure")).toBe("adventure");
    expect(inferStoryboardFromText("Tiệc carnival")).toBe("party");
  });

  it("uses full cinematic on single / first / finale and lite on long middles", () => {
    expect(resolveStoryboardDensity(0, 1, "cyberpunk")).toBe("full");
    expect(resolveStoryboardDensity(0, 10, "adventure")).toBe("full");
    expect(resolveStoryboardDensity(9, 10, "party")).toBe("full");
    expect(resolveStoryboardDensity(2, 10, "asmr")).toBe("lite");
    expect(resolveStoryboardDensity(4, 10, "asmr")).toBe("full");
    expect(storyboardChargeMs(720, "lite")).toBe(200);
    expect(storyboardChargeMs(720, "full")).toBe(720);
    expect(storyboardFromCatalogKey("cyberpunk")).toBe("cyberpunk");
  });

  it("skips cinematic packs on classic / reduceMotion, not on perf degrade", () => {
    expect(shouldPlayStoryboard({ storyboard: "cyberpunk" })).toBe(true);
    expect(shouldPlayStoryboard({ storyboard: "classic" })).toBe(false);
    expect(shouldPlayStoryboard({ storyboard: "asmr", reduceMotion: true })).toBe(false);
    expect(shouldPlayStoryboard({ storyboard: "party", degradeLevel: 2 })).toBe(true);
  });

  it("keeps adventure storyboard when theme id is default", () => {
    const theme = resolveRevealTheme({ remoteThemeId: "default", storyboardId: "adventure" });
    expect(theme.id).toBe("default");
    expect(theme.storyboard).toBe("adventure");
    expect(storyboardFromThemeId("default")).toBe("classic");
  });

  it("uses remote currentTheme as storyboard", () => {
    setRevealRemoteConfig({ currentTheme: "adventure" });
    expect(resolveActiveStoryboardId()).toBe("adventure");
    expect(storyboardBackdrop("adventure")[0]).toContain("1a1208");
  });

  it("forces classic on weak network when nothing is equipped", () => {
    setRevealRemoteConfig({ currentTheme: "cyberpunk" });
    setRevealNetworkRtt(420);
    expect(resolveActiveStoryboardId()).toBe("classic");
  });

  it("keeps equipped storyboard on weak network", () => {
    setRevealNetworkRtt(420);
    expect(resolveActiveStoryboardId({ equippedThemeId: "party" })).toBe("party");
    expect(resolveActiveStoryboardId({ equippedThemeId: "cyberpunk" })).toBe("cyberpunk");
    expect(resolveActiveStoryboardId({ equippedThemeId: "adventure" })).toBe("adventure");
  });
});

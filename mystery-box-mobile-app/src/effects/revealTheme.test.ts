import { describe, expect, it } from "vitest";
import {
  applyRevealTheme,
  applyRemoteLustrePalette,
  canonicalizeRevealThemeId,
  resolveRevealTheme,
  resolveThemedLustre,
} from "./revealTheme";
import { getEffectProfile } from "./config";
import { getLustrePalette } from "./lustrePalette";
import { setRevealRemoteConfig } from "./revealRemote";

describe("revealTheme", () => {
  it("infers neon theme from category keywords", () => {
    expect(resolveRevealTheme({ categoryName: "数码潮玩" }).id).toBe("neon");
    expect(resolveRevealTheme({ categoryName: "cyberpunk glitch" }).id).toBe("neon");
  });

  it("infers cute / luxury / adventure from VN/EN keywords", () => {
    expect(resolveRevealTheme({ boxName: "ASMR chữa lành" }).id).toBe("cute");
    expect(resolveRevealTheme({ boxName: "Tiệc carnival party" }).id).toBe("luxury");
    expect(resolveRevealTheme({ categoryName: "treasure adventure" }).id).toBe("default");
  });

  it("maps Doc2 aliases via canonicalize", () => {
    expect(canonicalizeRevealThemeId("cyberpunk")).toBe("neon");
    expect(canonicalizeRevealThemeId("asmr")).toBe("cute");
    expect(canonicalizeRevealThemeId("party")).toBe("luxury");
    expect(canonicalizeRevealThemeId("adventure")).toBe("default");
  });

  it("attaches adventure storyboard when forced", () => {
    expect(resolveRevealTheme({ remoteThemeId: "adventure" }).storyboard).toBe("adventure");
    expect(resolveRevealTheme({ categoryName: "treasure adventure" }).storyboard).toBe("adventure");
  });

  it("prefers remote theme override", () => {
    expect(resolveRevealTheme({ boxName: "数码盒", remoteThemeId: "cute" }).id).toBe("cute");
    expect(resolveRevealTheme({ remoteThemeId: "cyberpunk" }).id).toBe("neon");
  });

  it("applies theme sparkle without changing tier", () => {
    const base = getEffectProfile("GENERAL");
    const themed = applyRevealTheme(base, resolveRevealTheme({ categoryName: "限定珍藏" }));
    expect(themed.sparkleColor).not.toBe(base.sparkleColor);
    expect(themed.tier).toBe("GENERAL");
  });

  it("applies remote lustre palette override", () => {
    setRevealRemoteConfig({ lustrePaletteId: "vivid" });
    const base = getLustrePalette("HIDDEN");
    const tinted = applyRemoteLustrePalette(base);
    expect(tinted.rim[0]).not.toBe(base.rim[0]);
    const resolved = resolveThemedLustre("HIDDEN", resolveRevealTheme({ remoteThemeId: "neon" }));
    expect(resolved.rim[0]).not.toBe(base.rim[0]);
    setRevealRemoteConfig(null);
  });

  it("prefers per-box lustre palette over global id", () => {
    setRevealRemoteConfig({ lustrePaletteId: "warm", revealLustreBoxOverrides: "box-99:vivid" });
    const base = getLustrePalette("HIDDEN");
    const global = applyRemoteLustrePalette(base);
    const perBox = applyRemoteLustrePalette(base, "box-99");
    expect(perBox.rim[0]).not.toBe(global.rim[0]);
    setRevealRemoteConfig(null);
  });
});

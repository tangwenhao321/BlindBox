import { describe, expect, it } from "vitest";
import { blendLustreColor, getLustrePalette, lustreTierFromQuality, pickLustreColor, tintLustrePalette } from "./lustrePalette";
import { resolveThemedLustre } from "./revealTheme";

describe("lustrePalette", () => {
  it("returns multi-stop palettes per tier", () => {
    const legend = getLustrePalette("TREASURE_LEGEND");
    expect(legend.aurora.length).toBeGreaterThan(3);
    expect(legend.rays.length).toBeGreaterThan(2);
    expect(new Set(legend.rays).size).toBeGreaterThan(1);
  });

  it("top tier has prismatic sheen stops", () => {
    const top = getLustrePalette("TREASURE_PEERLESS");
    expect(top.sheen.length).toBeGreaterThanOrEqual(5);
    expect(pickLustreColor(top, "sparkles", 0)).not.toBe(pickLustreColor(top, "sparkles", 1));
  });

  it("maps user quality to lustre tier", () => {
    expect(lustreTierFromQuality("LEGENDARY")).toBe("TREASURE_LEGEND");
    expect(lustreTierFromQuality("HIDDEN")).toBe("HIDDEN");
    expect(lustreTierFromQuality("GENERAL")).toBeNull();
  });

  it("blendLustreColor shifts rgb toward accent", () => {
    expect(blendLustreColor("#ff0000", "#0000ff", 0.5).toLowerCase()).toBe("#800080");
    expect(blendLustreColor("transparent", "#0000ff", 0.5)).toBe("transparent");
  });

  it("tintLustrePalette keeps vignette but tints rim", () => {
    const base = getLustrePalette("GENERAL");
    const tinted = tintLustrePalette(base, "#00E5FF", 0.3);
    expect(tinted.vignette).toEqual(base.vignette);
    expect(tinted.rim[0]).not.toBe(base.rim[0]);
  });
});

describe("resolveThemedLustre", () => {
  it("returns base palette for default theme", () => {
    const base = getLustrePalette("HIDDEN");
    expect(resolveThemedLustre("HIDDEN", { id: "default", accent: "#4091FF", sparkle: "", rim: "", confetti: [], particleBias: "mixed" })).toEqual(base);
  });

  it("tints palette for neon theme", () => {
    const neon = resolveThemedLustre("TREASURE_LEGEND", {
      id: "neon",
      accent: "#00E5FF",
      sparkle: "",
      rim: "",
      confetti: [],
      particleBias: "shard",
    });
    const base = getLustrePalette("TREASURE_LEGEND");
    expect(neon.rim[0]).not.toBe(base.rim[0]);
  });
});

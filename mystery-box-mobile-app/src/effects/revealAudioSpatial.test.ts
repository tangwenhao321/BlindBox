import { describe, expect, it } from "vitest";
import { resolvePanVolumeScale, resolveRevealSoundPan } from "./revealAudioSpatial";

describe("revealAudioSpatial", () => {
  it("centers finale draw", () => {
    expect(resolveRevealSoundPan(9, 10, true)).toBe(0);
  });

  it("pans across batch indices", () => {
    expect(resolveRevealSoundPan(0, 5)).toBeLessThan(0);
    expect(resolveRevealSoundPan(4, 5)).toBeGreaterThan(0);
  });

  it("reduces volume slightly at extremes", () => {
    expect(resolvePanVolumeScale(0.3)).toBeLessThan(1);
    expect(resolvePanVolumeScale(0)).toBe(1);
  });
});

import { describe, expect, it } from "vitest";
import { getEffectProfile } from "./config";
import { getEffectProfileWithBoost } from "./intensity";

describe("effects/intensity", () => {
  it("boosts particles and rays on later reveals in a multi-draw", () => {
    const base = getEffectProfile("GENERAL", { reduceMotion: false });
    const last = getEffectProfileWithBoost("GENERAL", 4, 5, { reduceMotion: false });
    expect(last.particleCount).toBeGreaterThan(base.particleCount);
    expect(last.rayCount).toBeGreaterThanOrEqual(base.rayCount);
    expect(last.flashPeak).toBeGreaterThanOrEqual(base.flashPeak);
  });

  it("does not boost the first reveal", () => {
    const base = getEffectProfile("HIDDEN", { reduceMotion: false });
    const first = getEffectProfileWithBoost("HIDDEN", 0, 5, { reduceMotion: false });
    expect(first.particleCount).toBe(base.particleCount);
  });
});

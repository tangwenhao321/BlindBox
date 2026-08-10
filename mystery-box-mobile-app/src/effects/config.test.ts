import { describe, expect, it } from "vitest";
import { getEffectProfile, resolveHighestTier, resolvePrizeTier } from "./config";

describe("effects/config", () => {
  it("resolves unknown quality as GENERAL", () => {
    expect(resolvePrizeTier("abc")).toBe("GENERAL");
  });

  it("resolves highest tier by priority", () => {
    expect(resolveHighestTier(["GENERAL", "HIDDEN"])).toBe("HIDDEN");
    expect(resolveHighestTier(["GENERAL", "LEGENDARY"])).toBe("TREASURE_LEGEND");
  });

  it("reduces animation intensity in reduce-motion mode", () => {
    const legendary = getEffectProfile("TREASURE_LEGEND", { reduceMotion: true });
    expect(legendary.particleCount).toBe(0);
    expect(legendary.revealDelayMs).toBeLessThan(400);
  });
});


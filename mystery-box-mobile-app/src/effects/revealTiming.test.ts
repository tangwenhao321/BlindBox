import { describe, expect, it } from "vitest";
import { getEffectProfile } from "./config";
import { resolveHoldDuration } from "./revealTiming";

describe("resolveHoldDuration", () => {
  it("extends hold for finale and ceremony pacing", () => {
    const profile = getEffectProfile("TREASURE_LEGEND");
    const finaleHold = resolveHoldDuration("finale", profile, {}, 300);
    const fastHold = resolveHoldDuration("fast", profile, {}, 300);
    expect(finaleHold).toBeGreaterThan(fastHold);
    expect(finaleHold).toBeGreaterThanOrEqual(1700);
    expect(fastHold).toBeGreaterThanOrEqual(1100);
  });
});

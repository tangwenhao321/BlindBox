import { describe, expect, it, beforeEach } from "vitest";
import {
  clearRevealBehaviorProfile,
  recordRevealBehavior,
  resolveBehaviorRhythmScale,
  resetRevealBehaviorProfileForTests,
} from "./revealBehaviorProfile";

describe("revealBehaviorProfile", () => {
  beforeEach(async () => {
    resetRevealBehaviorProfileForTests();
    await clearRevealBehaviorProfile();
  });

  it("compresses rhythm when user skips often", async () => {
    for (let i = 0; i < 5; i += 1) {
      await recordRevealBehavior("play");
      await recordRevealBehavior("skip_one");
    }
    const scale = resolveBehaviorRhythmScale();
    expect(scale).toBeLessThan(1);
    expect(scale).toBeGreaterThanOrEqual(0.85);
  });

  it("slightly slows when user completes sequences", async () => {
    for (let i = 0; i < 4; i += 1) {
      await recordRevealBehavior("play");
      await recordRevealBehavior("complete");
    }
    const scale = resolveBehaviorRhythmScale();
    expect(scale).toBeGreaterThanOrEqual(1.02);
  });
});

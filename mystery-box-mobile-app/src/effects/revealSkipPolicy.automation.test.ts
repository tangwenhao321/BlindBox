import { describe, expect, it } from "vitest";
import {
  resolveSkipGuardTier,
  resolveSkipTapAction,
  resolveAccelerateTier,
  accelerateDurationScale,
  acceleratePlaybackRate,
  scaleBreathDurationMs,
  resolveRevealBreathPeriodMs,
} from "./revealSkipPolicy";

/** Full decision table — maps JOURNEY/DRAW skip whitebox cases to AUTO_UNIT. */
describe("revealSkipPolicy decision table (automation)", () => {
  const guards = ["normal", "guarded"] as const;
  const pausedVals = [false, true];
  const longPressVals = [false, true];
  const taps = [0, 1, 2];

  for (const guard of guards) {
    for (const paused of pausedVals) {
      for (const longPress of longPressVals) {
        for (const consecutiveTaps of taps) {
          const expected =
            guard === "normal" || longPress || consecutiveTaps >= 2 || paused ? "skip" : "pause";
          it(`guard=${guard} paused=${paused} long=${longPress} taps=${consecutiveTaps} => ${expected}`, () => {
            expect(resolveSkipTapAction(guard, paused, longPress, consecutiveTaps).action).toBe(expected);
          });
        }
      }
    }
  }

  it("guard tier matrix", () => {
    expect(resolveSkipGuardTier(undefined, "normal")).toBe("normal");
    expect(resolveSkipGuardTier("GENERAL", "normal")).toBe("normal");
    expect(resolveSkipGuardTier("GENERAL", "finale")).toBe("guarded");
    expect(resolveSkipGuardTier("GENERAL", "ceremony")).toBe("guarded");
    expect(resolveSkipGuardTier("PEERLESS", "normal")).toBe("guarded");
    expect(resolveSkipGuardTier("TREASURE_PEERLESS", "fast")).toBe("guarded");
  });

  it("accelerate tiers and scales", () => {
    expect(resolveAccelerateTier(false)).toBe(1);
    expect(resolveAccelerateTier(true)).toBe(2);
    expect(accelerateDurationScale(0)).toBe(1);
    expect(accelerateDurationScale(1)).toBe(0.67);
    expect(accelerateDurationScale(2)).toBe(0.4);
    expect(acceleratePlaybackRate(0)).toBe(1);
    expect(acceleratePlaybackRate(1)).toBe(1.5);
    expect(acceleratePlaybackRate(2)).toBe(2.5);
    expect(acceleratePlaybackRate(1, 2)).toBe(3);
  });

  it("breath periods and scaled duration", () => {
    expect(resolveRevealBreathPeriodMs("PEERLESS")).toBe(420);
    expect(resolveRevealBreathPeriodMs("TREASURE_PEERLESS")).toBe(420);
    expect(resolveRevealBreathPeriodMs("TREASURE_LEGEND")).toBe(560);
    expect(resolveRevealBreathPeriodMs("HIDDEN")).toBe(680);
    expect(resolveRevealBreathPeriodMs("NORMAL")).toBe(900);
    expect(scaleBreathDurationMs(1000, 0)).toBe(1000);
    expect(scaleBreathDurationMs(1000, 1)).toBe(670);
    expect(scaleBreathDurationMs(1000, 2)).toBe(400);
  });
});

import { describe, expect, it, beforeEach } from "vitest";
import { alignRevealPhaseStart } from "./revealPhaseAlign";
import { resolveTimeOfDayBucket, resolveTimeOfDayLustreSaturation } from "./revealTimeOfDay";
import { recordRevealForFatigue, resolveSessionFatigueScale, resetSessionFatigueForTests } from "./revealSessionFatigue";
import { acceleratePlaybackRate, accelerateDurationScale } from "./revealSkipPolicy";
import { resolveCopyLengthBucket } from "./revealCopyPool";
import { sanitizeRevealText } from "./revealContentSanitize";
import { debounceRevealAction, REVEAL_DEBOUNCE_MS, resetRevealDebounceForTests } from "./revealDebounce";
import { revealLayerZIndex } from "./revealLayerZIndex";

describe("revealPhaseAlign", () => {
  it("staggers first and last in batch window", () => {
    expect(alignRevealPhaseStart(0, 10).cardFlipDelayMs).toBe(0);
    expect(alignRevealPhaseStart(9, 10).cardFlipDelayMs).toBe(120);
  });
});

describe("revealTimeOfDay", () => {
  it("maps hours to buckets", () => {
    expect(resolveTimeOfDayBucket(new Date("2026-05-30T08:00:00"))).toBe("morning");
    expect(resolveTimeOfDayLustreSaturation("night")).toBeLessThan(1);
  });
});

describe("revealSessionFatigue", () => {
  beforeEach(() => resetSessionFatigueForTests());
  it("reduces scale after many reveals", () => {
    for (let i = 0; i < 20; i += 1) recordRevealForFatigue();
    expect(resolveSessionFatigueScale()).toBeLessThan(1);
  });
});

describe("revealSkipPolicy AV sync", () => {
  it("matches 1.5x/2.5x labels", () => {
    expect(acceleratePlaybackRate(1)).toBe(1.5);
    expect(acceleratePlaybackRate(2)).toBe(2.5);
    expect(accelerateDurationScale(1)).toBeCloseTo(1 / 1.5, 1);
    expect(accelerateDurationScale(2)).toBe(0.4);
  });
});

describe("revealCopyPool length bucket", () => {
  it("picks short copy for fast holds", () => {
    expect(resolveCopyLengthBucket(800)).toBe("short");
    expect(resolveCopyLengthBucket(1500)).toBe("normal");
  });
});

describe("revealContentSanitize", () => {
  it("truncates and masks blocklist", () => {
    expect(sanitizeRevealText("hello spam world", 20)).toContain("•");
  });
});

describe("revealDebounce", () => {
  beforeEach(() => resetRevealDebounceForTests());
  it("blocks rapid replay taps", () => {
    expect(debounceRevealAction("replay", REVEAL_DEBOUNCE_MS.replay)).toBe(true);
    expect(debounceRevealAction("replay", REVEAL_DEBOUNCE_MS.replay)).toBe(false);
  });
});

describe("revealLayerZIndex", () => {
  it("orders banner below skip bar", () => {
    expect(revealLayerZIndex.banner).toBeLessThan(revealLayerZIndex.skipBar);
  });
});

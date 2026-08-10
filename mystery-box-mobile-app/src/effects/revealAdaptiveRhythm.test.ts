import { describe, expect, it, beforeEach } from "vitest";
import { shouldShowBatchBeat, resolveBatchRevealWindow } from "./revealAdaptiveRhythm";
import { setRevealRemoteConfig } from "./revealRemote";

describe("revealAdaptiveRhythm batch beat", () => {
  beforeEach(() => {
    setRevealRemoteConfig({ batchBeatEnabled: true, batchRevealSize: 8 });
  });

  it("shows beat at batch boundary", () => {
    expect(shouldShowBatchBeat(7, 30, 8)).toBe(true);
    expect(shouldShowBatchBeat(6, 30, 8)).toBe(false);
  });

  it("supports mega50 preset threshold", () => {
    setRevealRemoteConfig({ batchPreset: "mega50", batchRevealThreshold: 50, batchRevealSize: 12 });
    const win = resolveBatchRevealWindow(50);
    expect(win.enabled).toBe(true);
    expect(win.batchSize).toBe(12);
  });
});

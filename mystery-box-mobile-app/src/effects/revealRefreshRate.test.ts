import { describe, expect, it } from "vitest";
import {
  getRevealRefreshRateScale,
  resetRevealRefreshRateForTests,
  updateRevealRefreshRateFromFps,
} from "./revealRefreshRate";
import { setRevealRemoteConfig } from "./revealRemote";

describe("revealRefreshRate", () => {
  it("compresses timing on high refresh sampling", () => {
    resetRevealRefreshRateForTests();
    setRevealRemoteConfig({ refreshRateHighScale: 0.94, refreshRateLowScale: 1.04 });
    updateRevealRefreshRateFromFps(120);
    expect(getRevealRefreshRateScale()).toBe(0.94);
    updateRevealRefreshRateFromFps(40);
    expect(getRevealRefreshRateScale()).toBe(1.04);
    setRevealRemoteConfig(null);
    resetRevealRefreshRateForTests();
  });
});

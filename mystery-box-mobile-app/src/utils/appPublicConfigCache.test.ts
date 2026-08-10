import { beforeEach, describe, expect, it, vi } from "vitest";
import { readCachedPublicConfig, writeCachedPublicConfig } from "./appPublicConfigCache";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";

describe("appPublicConfigCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads null when cache empty", async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    await expect(readCachedPublicConfig()).resolves.toBeNull();
  });

  it("round-trips config json", async () => {
    const config = {
      supportHotline: "400",
      enterpriseWechat: "wx",
      revealParticleScale: 1,
      revealConfettiScale: 1,
      revealDelayMsOverride: 0,
      revealChargeScale: 1,
      revealFlashScale: 1,
      revealLustreScale: 1,
      revealFeedTickerEnabled: true,
      revealInterDrawDelayMs: 450,
      revealFinalePauseMs: 600,
      revealFinaleHoldMsExtra: 300,
      revealFinaleTeaserEnabled: true,
      revealSilenceBeforeFinaleMs: 220,
      revealSummaryHeroMs: 1800,
    };
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(JSON.stringify(config));
    await expect(readCachedPublicConfig()).resolves.toEqual(config);
    await writeCachedPublicConfig(config);
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });
});

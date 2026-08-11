import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetItem, mockSetItem } = vi.hoisted(() => ({
  mockGetItem: vi.fn(async (_key?: string) => null as string | null),
  mockSetItem: vi.fn(async (_key?: string, _value?: string) => undefined),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: (key: string) => mockGetItem(key),
    setItem: (key: string, value: string) => mockSetItem(key, value),
  },
}));

vi.mock("../utils/revealStorageNamespace", () => ({
  revealStorageKey: (base: string) => base,
}));

import {
  getActiveEmotionProfileId,
  hydrateActiveEmotionProfileId,
  loadEmotionProfiles,
  resetEmotionProfilesForTests,
  resolveActiveEmotionProfile,
  setActiveEmotionProfileId,
} from "./revealEmotionProfiles";

describe("revealEmotionProfiles persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetEmotionProfilesForTests();
    mockGetItem.mockResolvedValue(null);
  });

  it("persists active profile id", async () => {
    await setActiveEmotionProfileId("quiet");
    expect(mockSetItem).toHaveBeenCalledWith("reveal_emotion_active_v1", "quiet");
    expect(getActiveEmotionProfileId()).toBe("quiet");
    expect(resolveActiveEmotionProfile().id).toBe("quiet");
  });

  it("hydrates quiet / chill / stim from storage", async () => {
    mockGetItem.mockImplementation(async (key?: string) => {
      if (key === "reveal_emotion_active_v1") return "quiet";
      return null;
    });
    await loadEmotionProfiles();
    expect(getActiveEmotionProfileId()).toBe("quiet");
    expect(resolveActiveEmotionProfile().volumeScale).toBe(0.6);

    mockGetItem.mockImplementation(async (key?: string) => {
      if (key === "reveal_emotion_active_v1") return "chill";
      return null;
    });
    await hydrateActiveEmotionProfileId();
    expect(getActiveEmotionProfileId()).toBe("chill");
  });
});

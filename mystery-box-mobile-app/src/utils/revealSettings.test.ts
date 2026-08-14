import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getRevealCeremonyTemplateId,
  getRevealEffectPresetId,
  setRevealCeremonyTemplateId,
  setRevealEffectPresetId,
} from "./revealSettings";

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

vi.mock("./revealStorageNamespace", () => ({
  revealStorageKey: (base: string) => base,
}));

describe("revealSettings ceremony template", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
  });

  it("preserves eyeCare and collectMinimal ids", async () => {
    mockGetItem.mockResolvedValue("eyeCare");
    await expect(getRevealCeremonyTemplateId()).resolves.toBe("eyeCare");

    mockGetItem.mockResolvedValue("collectMinimal");
    await expect(getRevealCeremonyTemplateId()).resolves.toBe("collectMinimal");
  });

  it("preserves immersive, efficiency, and standard", async () => {
    mockGetItem.mockResolvedValue("immersive");
    await expect(getRevealCeremonyTemplateId()).resolves.toBe("immersive");
    mockGetItem.mockResolvedValue("efficiency");
    await expect(getRevealCeremonyTemplateId()).resolves.toBe("efficiency");
    mockGetItem.mockResolvedValue("standard");
    await expect(getRevealCeremonyTemplateId()).resolves.toBe("standard");
  });

  it("falls back to standard for unknown ids", async () => {
    mockGetItem.mockResolvedValue("mystery");
    await expect(getRevealCeremonyTemplateId()).resolves.toBe("standard");
    mockGetItem.mockResolvedValue(null);
    await expect(getRevealCeremonyTemplateId()).resolves.toBe("standard");
  });

  it("persists eyeCare template id", async () => {
    await setRevealCeremonyTemplateId("eyeCare");
    expect(mockSetItem).toHaveBeenCalledWith("reveal_ceremony_template_v1", "eyeCare");
  });
});

describe("revealSettings effect preset", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
  });

  it("defaults to warm brass when unset", async () => {
    mockGetItem.mockResolvedValue(null);
    await expect(getRevealEffectPresetId()).resolves.toBe("warm");
  });

  it("reads warm / default / neon", async () => {
    mockGetItem.mockResolvedValue("default");
    await expect(getRevealEffectPresetId()).resolves.toBe("default");
    mockGetItem.mockResolvedValue("neon");
    await expect(getRevealEffectPresetId()).resolves.toBe("neon");
  });

  it("persists warm preset", async () => {
    await setRevealEffectPresetId("warm");
    expect(mockSetItem).toHaveBeenCalledWith("reveal_effect_preset_v1", "warm");
  });
});

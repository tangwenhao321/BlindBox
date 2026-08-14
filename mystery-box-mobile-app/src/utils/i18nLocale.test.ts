import { beforeEach, describe, expect, it, vi } from "vitest";

import { getStoredLocale } from "./i18nLocale";

const mockGetItem = vi.fn();
const mockSetItem = vi.fn();

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: (...args: unknown[]) => mockGetItem(...args),
    setItem: (...args: unknown[]) => mockSetItem(...args),
  },
}));

vi.mock("../i18n", () => ({
  default: { changeLanguage: vi.fn() },
}));

describe("getStoredLocale", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zh-CN when stored", async () => {
    mockGetItem.mockResolvedValue("zh-CN");
    await expect(getStoredLocale()).resolves.toBe("zh-CN");
    expect(mockGetItem).toHaveBeenCalledWith("app_locale_v1");
  });

  it("returns en-US when stored", async () => {
    mockGetItem.mockResolvedValue("en-US");
    await expect(getStoredLocale()).resolves.toBe("en-US");
  });

  it("returns vi-VN when stored", async () => {
    mockGetItem.mockResolvedValue("vi-VN");
    await expect(getStoredLocale()).resolves.toBe("vi-VN");
  });

  it("returns null for unknown locale", async () => {
    mockGetItem.mockResolvedValue("fr-FR");
    await expect(getStoredLocale()).resolves.toBeNull();
  });

  it("returns null when nothing stored", async () => {
    mockGetItem.mockResolvedValue(null);
    await expect(getStoredLocale()).resolves.toBeNull();
  });
});

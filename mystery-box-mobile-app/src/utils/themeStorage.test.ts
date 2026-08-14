import { beforeEach, describe, expect, it, vi } from "vitest";

import { getStoredThemeMode, setStoredThemeMode } from "./themeStorage";

const mockGetItem = vi.fn();
const mockSetItem = vi.fn();

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: (...args: unknown[]) => mockGetItem(...args),
    setItem: (...args: unknown[]) => mockSetItem(...args),
  },
}));

describe("themeStorage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads dark mode from storage", async () => {
    mockGetItem.mockResolvedValue("dark");
    await expect(getStoredThemeMode()).resolves.toBe("dark");
    expect(mockGetItem).toHaveBeenCalledWith("app_theme_mode_v1");
  });

  it("reads light mode from storage", async () => {
    mockGetItem.mockResolvedValue("light");
    await expect(getStoredThemeMode()).resolves.toBe("light");
  });

  it("reads system mode from storage", async () => {
    mockGetItem.mockResolvedValue("system");
    await expect(getStoredThemeMode()).resolves.toBe("system");
  });

  it("returns null for unknown mode", async () => {
    mockGetItem.mockResolvedValue("auto");
    await expect(getStoredThemeMode()).resolves.toBeNull();
  });

  it("persists theme mode", async () => {
    await setStoredThemeMode("dark");
    expect(mockSetItem).toHaveBeenCalledWith("app_theme_mode_v1", "dark");
  });
});

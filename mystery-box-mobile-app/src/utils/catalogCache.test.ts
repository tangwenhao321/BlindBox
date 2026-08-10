import { beforeEach, describe, expect, it, vi } from "vitest";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { readCatalogCache, writeCatalogCache } from "./catalogCache";

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

describe("catalogCache", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when cache missing", async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue(null);
    await expect(readCatalogCache("home")).resolves.toBeNull();
  });

  it("writes and reads fresh cache", async () => {
    const store: Record<string, string> = {};
    vi.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
      store[key] = value;
    });
    vi.mocked(AsyncStorage.getItem).mockImplementation(async (key) => store[key] ?? null);
    const items = [{ id: "b1", name: "Box" }] as never[];
    await writeCatalogCache("home", items);
    await expect(readCatalogCache("home")).resolves.toEqual(items);
  });
});

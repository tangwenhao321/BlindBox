import { beforeEach, describe, expect, it, vi } from "vitest";
import { addSearchHistory, clearSearchHistory, loadSearchHistory } from "./searchHistoryStorage";

const store = new Map<string, string>();

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => store.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      store.delete(key);
    }),
  },
}));

describe("searchHistoryStorage", () => {
  beforeEach(() => {
    store.clear();
  });

  it("stores and dedupes keywords", async () => {
    await addSearchHistory("盲盒");
    await addSearchHistory("系列A");
    await addSearchHistory("盲盒");
    expect(await loadSearchHistory()).toEqual(["盲盒", "系列A"]);
  });

  it("clears history", async () => {
    await addSearchHistory("test");
    await clearSearchHistory();
    expect(await loadSearchHistory()).toEqual([]);
  });
});

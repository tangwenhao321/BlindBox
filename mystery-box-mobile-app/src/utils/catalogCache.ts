import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MysteryBox } from "../types";

const PREFIX = "catalog_cache_v1_";
const TTL_MS = 1000 * 60 * 30;

type CacheEntry = {
  savedAt: number;
  items: MysteryBox[];
};

export async function readCatalogCache(scope: "home" | "mall"): Promise<MysteryBox[] | null> {
  try {
    const raw = await AsyncStorage.getItem(`${PREFIX}${scope}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed?.items?.length || Date.now() - parsed.savedAt > TTL_MS) {
      return null;
    }
    return parsed.items;
  } catch {
    return null;
  }
}

export async function writeCatalogCache(scope: "home" | "mall", items: MysteryBox[]) {
  try {
    const entry: CacheEntry = { savedAt: Date.now(), items };
    await AsyncStorage.setItem(`${PREFIX}${scope}`, JSON.stringify(entry));
  } catch {
    // Ignore cache write failures.
  }
}

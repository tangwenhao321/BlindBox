import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearFestivalBundleCache } from "./revealFestivalBundle";
import { clearOfflineRevealThemeCache } from "./revealOfflineMode";
import { clearSnapshotCache as clearSnapshotCacheImpl } from "./revealSnapshotCache";

export const CACHE_TTL = {
  SYSTEM_MS: 24 * 60 * 60 * 1000,
  THEMED_ASSETS_MS: 7 * 24 * 60 * 60 * 1000,
  SNAPSHOT_MS: 7 * 24 * 60 * 60 * 1000,
} as const;

const THEMED_ASSET_PREFIX = "reveal_themed_asset_v1:";

type ThemedAssetEntry = {
  themeId: string;
  cachedAt: number;
};

export function clearSystemCache(): void {
  // Reserved for future native / image pipeline purge hooks.
}

export async function clearThemedAssets(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const themedKeys = keys.filter((k) => k.startsWith(THEMED_ASSET_PREFIX));
  if (themedKeys.length) await AsyncStorage.multiRemove(themedKeys);
  clearFestivalBundleCache();
  clearOfflineRevealThemeCache();
}

export async function clearSnapshotCache(): Promise<void> {
  await clearSnapshotCacheImpl();
}

export async function pruneThemedAssets(maxAgeMs = CACHE_TTL.THEMED_ASSETS_MS): Promise<number> {
  const keys = await AsyncStorage.getAllKeys();
  const themedKeys = keys.filter((k) => k.startsWith(THEMED_ASSET_PREFIX));
  if (!themedKeys.length) return 0;
  const rows = await AsyncStorage.multiGet(themedKeys);
  const cutoff = Date.now() - maxAgeMs;
  const stale: string[] = [];
  for (const [key, raw] of rows) {
    try {
      const entry = raw ? (JSON.parse(raw) as ThemedAssetEntry) : null;
      if (!entry || entry.cachedAt < cutoff) stale.push(key);
    } catch {
      stale.push(key);
    }
  }
  if (stale.length) {
    await AsyncStorage.multiRemove(stale);
    clearFestivalBundleCache();
    clearOfflineRevealThemeCache();
  }
  return stale.length;
}

export async function registerThemedAsset(themeId: string): Promise<void> {
  const entry: ThemedAssetEntry = { themeId, cachedAt: Date.now() };
  await AsyncStorage.setItem(`${THEMED_ASSET_PREFIX}${themeId}`, JSON.stringify(entry));
}

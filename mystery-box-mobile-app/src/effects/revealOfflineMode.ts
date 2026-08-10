import { isOffline } from "../utils/connectivity";

const OFFLINE_REVEAL_ENABLED = true;
const bundledThemeIds = ["default", "night_soft", "festival_stub"];
const downloadedThemes = new Set<string>(["default"]);

export function listOfflineRevealThemeBundles(): string[] {
  return bundledThemeIds;
}

export function isOfflineThemeReady(themeId: string): boolean {
  return downloadedThemes.has(themeId) || themeId === "default";
}

/** Local reveal pipeline (animation + bundled sounds) works without network. */
export function isOfflineRevealAvailable(): boolean {
  if (!isOffline()) return true;
  return OFFLINE_REVEAL_ENABLED;
}

export function isOfflineRevealBlocked(): boolean {
  return isOffline() && !isOfflineRevealAvailable();
}

export function clearOfflineRevealThemeCache(): void {
  downloadedThemes.clear();
  downloadedThemes.add("default");
}

export function resolveOfflineRevealAssetPriority(): "bundled" | "remote" {
  return isOffline() ? "bundled" : "remote";
}

/** Download reveal theme bundle to local cache when CDN is reachable. */
export async function prefetchOfflineRevealBundle(themeId: string, uri?: string): Promise<boolean> {
  if (!uri || isOfflineThemeReady(themeId)) {
    downloadedThemes.add(themeId);
    return true;
  }
  try {
    const FS = await import("expo-file-system/legacy");
    const dest = `${FS.cacheDirectory ?? FS.documentDirectory ?? ""}reveal-theme-${themeId}.bundle`;
    if (!dest || dest === `reveal-theme-${themeId}.bundle`) {
      downloadedThemes.add(themeId);
      return true;
    }
    await FS.downloadAsync(uri, dest);
    downloadedThemes.add(themeId);
    return true;
  } catch {
    return false;
  }
}

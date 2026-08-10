import { Platform } from "react-native";
import { api } from "../api";
import { getAppReleaseChannel, getLocalAppVersion } from "../utils/appVersion";

export type AppUpdateInfo = {
  hasUpdate: boolean;
  forceUpdate: boolean;
  versionCode: number;
  versionName: string;
  downloadUrl: string;
  releaseNotes: string;
  /** Builds below this are unsupported and must update; 0 means no floor. */
  minSupportedVersionCode: number;
};

const EMPTY: AppUpdateInfo = {
  hasUpdate: false,
  forceUpdate: false,
  versionCode: 0,
  versionName: "",
  downloadUrl: "",
  releaseNotes: "",
  minSupportedVersionCode: 0,
};

function resolveStaticManifestUrl() {
  const base = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || "";
  if (!base) return "";
  if (base.includes("/test-api")) return base.replace(/\/test-api\/?$/, "/test-downloads/app-update.json");
  return "";
}

type UpdateCheckPayload = {
  hasUpdate?: boolean;
  forceUpdate?: boolean;
  versionCode?: number;
  versionName?: string;
  downloadUrl?: string;
  releaseNotes?: string;
  minSupportedVersionCode?: number;
};

function mapUpdatePayload(localVersionCode: number, row: UpdateCheckPayload): AppUpdateInfo {
  const remoteCode = Number(row.versionCode ?? 0);
  const hasUpdate = row.hasUpdate === true || (remoteCode > 0 && localVersionCode < remoteCode);
  if (!hasUpdate || remoteCode <= 0 || !row.downloadUrl?.trim()) return EMPTY;
  const minSupported = Math.max(0, Number(row.minSupportedVersionCode ?? 0) || 0);
  return {
    hasUpdate: true,
    forceUpdate: !!row.forceUpdate || (minSupported > 0 && localVersionCode < minSupported),
    versionCode: remoteCode,
    versionName: row.versionName?.trim() || String(remoteCode),
    downloadUrl: row.downloadUrl.trim(),
    releaseNotes: row.releaseNotes?.trim() || "",
    minSupportedVersionCode: minSupported,
  };
}

async function fetchStaticAppUpdateInfo(localVersionCode: number): Promise<AppUpdateInfo | null> {
  const manifestUrl = resolveStaticManifestUrl();
  if (!manifestUrl) return null;
  const response = await fetch(manifestUrl, { headers: { Accept: "application/json" } });
  if (!response.ok) return null;
  const row = (await response.json()) as UpdateCheckPayload;
  const mapped = mapUpdatePayload(localVersionCode, row);
  return mapped.hasUpdate ? mapped : null;
}

export async function fetchAppUpdateInfo(versionCode = getLocalAppVersion().versionCode): Promise<AppUpdateInfo> {
  try {
    const response = await api.get<{ result: UpdateCheckPayload }>("/front/app/update-check", {
      params: {
        platform: Platform.OS,
        versionCode,
        channel: getAppReleaseChannel(),
      },
    });
    const mapped = mapUpdatePayload(versionCode, response.data.result ?? {});
    if (mapped.hasUpdate) return mapped;
  } catch {
    // fall through to static manifest
  }

  const fallback = await fetchStaticAppUpdateInfo(versionCode);
  return fallback ?? EMPTY;
}

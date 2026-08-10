import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import { Platform } from "react-native";
import i18n from "../i18n";

export type ApkDownloadProgress = {
  totalBytes: number;
  downloadedBytes: number;
  fraction: number;
};

function resolveApkPath(versionCode: number) {
  const base = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!base) {
    throw new Error(i18n.t("appUpdate.storageUnavailable"));
  }
  return `${base}mystery-box-update-${versionCode}.apk`;
}

export async function downloadApkUpdate(
  downloadUrl: string,
  versionCode: number,
  onProgress?: (progress: ApkDownloadProgress) => void,
): Promise<string> {
  const target = resolveApkPath(versionCode);
  await FileSystem.deleteAsync(target, { idempotent: true }).catch(() => undefined);

  const download = FileSystem.createDownloadResumable(
    downloadUrl,
    target,
    {},
    (progress) => {
      const total = progress.totalBytesExpectedToWrite || 0;
      const downloaded = progress.totalBytesWritten || 0;
      onProgress?.({
        totalBytes: total,
        downloadedBytes: downloaded,
        fraction: total > 0 ? downloaded / total : 0,
      });
    },
  );

  const result = await download.downloadAsync();
  if (!result?.uri) {
    throw new Error(i18n.t("appUpdate.downloadFailed"));
  }
  return result.uri;
}

export async function installDownloadedApk(apkUri: string): Promise<void> {
  if (Platform.OS !== "android") {
    throw new Error(i18n.t("appUpdate.platformUnsupported"));
  }
  const contentUri = await FileSystem.getContentUriAsync(apkUri);
  await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
    data: contentUri,
    flags: 1,
    type: "application/vnd.android.package-archive",
  });
}

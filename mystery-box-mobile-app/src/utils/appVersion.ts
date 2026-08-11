import * as Application from "expo-application";
import Constants from "expo-constants";
import { Platform } from "react-native";

export type LocalAppVersion = {
  versionCode: number;
  versionName: string;
  channel: string;
};

export function getAppReleaseChannel(): string {
  const variant = process.env.EXPO_PUBLIC_APP_VARIANT?.trim();
  if (variant) return variant;
  const fromExtra = (
    Constants.expoConfig?.extra as { appVariant?: string } | undefined
  )?.appVariant?.trim();
  if (fromExtra) return fromExtra;
  return __DEV__ ? "dev" : "production";
}

export function getLocalAppVersion(): LocalAppVersion {
  const versionName =
    Application.nativeApplicationVersion ??
    Constants.expoConfig?.version ??
    "0.0.0";

  let versionCode = 0;
  if (Platform.OS === "android") {
    const build = Application.nativeBuildVersion;
    const parsed = parseInt(build ?? "", 10);
    versionCode = Number.isFinite(parsed) ? parsed : 0;
    if (versionCode <= 0) {
      const fromConfig = Constants.expoConfig?.android?.versionCode;
      if (typeof fromConfig === "number" && fromConfig > 0) {
        versionCode = fromConfig;
      }
    }
  } else if (Platform.OS === "ios") {
    const build = Application.nativeBuildVersion;
    const parsed = parseInt(build ?? "", 10);
    versionCode = Number.isFinite(parsed) ? parsed : 0;
  }

  return {
    versionCode,
    versionName,
    channel: getAppReleaseChannel(),
  };
}

export function isNativeAppUpdateSupported(): boolean {
  return Platform.OS === "android" && Constants.appOwnership !== "expo";
}

import { Platform } from "react-native";

/**
 * App channel for digital-goods gating.
 * iOS App Store builds must set EXPO_PUBLIC_APP_CHANNEL=appstore so spoofing
 * X-Client-Platform: android cannot bypass IosDigitalGoodsGuard.
 */
export function resolveAppChannel(): string {
  const fromEnv = (process.env.EXPO_PUBLIC_APP_CHANNEL || "").trim();
  if (fromEnv) return fromEnv;
  if (Platform.OS === "ios") {
    const variant = (process.env.EXPO_PUBLIC_APP_VARIANT || "").trim();
    if (variant === "production" || variant === "production-vn") {
      return "appstore";
    }
  }
  return Platform.OS === "ios" ? "ios" : "android";
}

export function clientPlatformHeaders(): Record<string, string> {
  return {
    "X-Client-Platform": Platform.OS,
    "X-App-Channel": resolveAppChannel(),
  };
}

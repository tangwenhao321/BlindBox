import { Platform } from "react-native";

/**
 * App channel for digital-goods gating.
 * iOS production / production-vn defaults to appstore (via EXPO_PUBLIC_APP_VARIANT)
 * so spoofing X-Client-Platform alone cannot bypass IosDigitalGoodsGuard.
 * Android never reports appstore — even if EXPO_PUBLIC_APP_CHANNEL was set that way in EAS.
 */
export function resolveAppChannel(): string {
  const fromEnv = (process.env.EXPO_PUBLIC_APP_CHANNEL || "").trim();
  if (Platform.OS === "android") {
    if (fromEnv && fromEnv.toLowerCase() !== "appstore") {
      return fromEnv;
    }
    return "android";
  }
  if (fromEnv) return fromEnv;
  if (Platform.OS === "ios") {
    const variant = (process.env.EXPO_PUBLIC_APP_VARIANT || "").trim();
    if (variant === "production" || variant === "production-vn") {
      return "appstore";
    }
  }
  return Platform.OS === "ios" ? "ios" : "android";
}

function isReleaseIosVariant(): boolean {
  const variant = (process.env.EXPO_PUBLIC_APP_VARIANT || "").trim();
  return variant === "production" || variant === "production-vn";
}

/**
 * Optional native App Attest assertion. Scaffold returns null until DCAppAttestService is wired.
 */
export function getAppAttestAssertion(): string | null {
  return null;
}

export function clientPlatformHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Client-Platform": Platform.OS,
    "X-App-Channel": resolveAppChannel(),
  };
  if (Platform.OS !== "ios") {
    return headers;
  }
  // Never send forgeable static tokens on App Store release builds.
  if (isReleaseIosVariant()) {
    const native = getAppAttestAssertion();
    if (native) {
      headers["X-Apple-App-Attest"] = native;
    }
    return headers;
  }
  const appAttest = (process.env.EXPO_PUBLIC_APPLE_APP_ATTEST || "").trim();
  if (appAttest) {
    headers["X-Apple-App-Attest"] = appAttest;
  }
  return headers;
}

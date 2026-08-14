import { describe, expect, it, afterEach } from "vitest";
import { Platform } from "react-native";
import { clientPlatformHeaders, resolveAppChannel } from "./clientAttestation";

describe("clientAttestation", () => {
  const originalChannel = process.env.EXPO_PUBLIC_APP_CHANNEL;
  const originalVariant = process.env.EXPO_PUBLIC_APP_VARIANT;
  const originalAttest = process.env.EXPO_PUBLIC_APPLE_APP_ATTEST;
  const originalOs = Platform.OS;

  afterEach(() => {
    if (originalChannel === undefined) delete process.env.EXPO_PUBLIC_APP_CHANNEL;
    else process.env.EXPO_PUBLIC_APP_CHANNEL = originalChannel;
    if (originalVariant === undefined) delete process.env.EXPO_PUBLIC_APP_VARIANT;
    else process.env.EXPO_PUBLIC_APP_VARIANT = originalVariant;
    if (originalAttest === undefined) delete process.env.EXPO_PUBLIC_APPLE_APP_ATTEST;
    else process.env.EXPO_PUBLIC_APPLE_APP_ATTEST = originalAttest;
    (Platform as { OS: string }).OS = originalOs;
  });

  it("uses EXPO_PUBLIC_APP_CHANNEL when set on iOS", () => {
    (Platform as { OS: string }).OS = "ios";
    process.env.EXPO_PUBLIC_APP_CHANNEL = "appstore";
    expect(resolveAppChannel()).toBe("appstore");
    const headers = clientPlatformHeaders();
    expect(headers["X-App-Channel"]).toBe("appstore");
    expect(headers["X-Client-Platform"]).toBe("ios");
  });

  it("android never returns appstore even if EXPO_PUBLIC_APP_CHANNEL=appstore", () => {
    (Platform as { OS: string }).OS = "android";
    process.env.EXPO_PUBLIC_APP_CHANNEL = "appstore";
    expect(resolveAppChannel()).toBe("android");
    expect(clientPlatformHeaders()["X-App-Channel"]).toBe("android");
  });

  it("android honors non-appstore EXPO_PUBLIC_APP_CHANNEL", () => {
    (Platform as { OS: string }).OS = "android";
    process.env.EXPO_PUBLIC_APP_CHANNEL = "play";
    expect(resolveAppChannel()).toBe("play");
  });

  it("ios production variant defaults to appstore when channel unset", () => {
    (Platform as { OS: string }).OS = "ios";
    delete process.env.EXPO_PUBLIC_APP_CHANNEL;
    process.env.EXPO_PUBLIC_APP_VARIANT = "production";
    expect(resolveAppChannel()).toBe("appstore");
  });

  it("omits App Attest header when env unset", () => {
    delete process.env.EXPO_PUBLIC_APPLE_APP_ATTEST;
    expect(clientPlatformHeaders()["X-Apple-App-Attest"]).toBeUndefined();
  });

  it("omits static App Attest on production-vn even if env set", () => {
    (Platform as { OS: string }).OS = "ios";
    process.env.EXPO_PUBLIC_APP_VARIANT = "production-vn";
    process.env.EXPO_PUBLIC_APPLE_APP_ATTEST = "forgeable-token";
    expect(clientPlatformHeaders()["X-Apple-App-Attest"]).toBeUndefined();
  });
});

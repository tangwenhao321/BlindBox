import { describe, expect, it, afterEach } from "vitest";
import { clientPlatformHeaders, resolveAppChannel } from "./clientAttestation";

describe("clientAttestation", () => {
  const originalChannel = process.env.EXPO_PUBLIC_APP_CHANNEL;
  const originalAttest = process.env.EXPO_PUBLIC_APPLE_APP_ATTEST;

  afterEach(() => {
    if (originalChannel === undefined) delete process.env.EXPO_PUBLIC_APP_CHANNEL;
    else process.env.EXPO_PUBLIC_APP_CHANNEL = originalChannel;
    if (originalAttest === undefined) delete process.env.EXPO_PUBLIC_APPLE_APP_ATTEST;
    else process.env.EXPO_PUBLIC_APPLE_APP_ATTEST = originalAttest;
  });

  it("uses EXPO_PUBLIC_APP_CHANNEL when set", () => {
    process.env.EXPO_PUBLIC_APP_CHANNEL = "appstore";
    expect(resolveAppChannel()).toBe("appstore");
    const headers = clientPlatformHeaders();
    expect(headers["X-App-Channel"]).toBe("appstore");
    expect(headers["X-Client-Platform"]).toBeTruthy();
  });

  it("omits App Attest header when env unset", () => {
    delete process.env.EXPO_PUBLIC_APPLE_APP_ATTEST;
    expect(clientPlatformHeaders()["X-Apple-App-Attest"]).toBeUndefined();
  });
});

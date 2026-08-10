import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerExpoPushToken } from "./pushTokenService";

const { postMock, loadExpoNotificationsMock, trackEventMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  loadExpoNotificationsMock: vi.fn(),
  trackEventMock: vi.fn(),
}));

vi.mock("../api", () => ({
  api: { post: postMock },
  buildAuthHeaders: (token: string) => ({ token }),
  parseError: (error: unknown) => (error instanceof Error ? error.message : "error"),
}));

vi.mock("../utils/expoNotificationsGate", () => ({
  loadExpoNotifications: loadExpoNotificationsMock,
}));

vi.mock("../utils/analytics", () => ({
  trackEvent: trackEventMock,
}));

describe("pushTokenService", () => {
  beforeEach(() => {
    postMock.mockReset();
    loadExpoNotificationsMock.mockReset();
    trackEventMock.mockReset();
  });

  it("no-ops when expo notifications unavailable", async () => {
    loadExpoNotificationsMock.mockResolvedValueOnce(null);
    await registerExpoPushToken("token-1");
    expect(postMock).not.toHaveBeenCalled();
  });

  it("registers push token when permission granted", async () => {
    loadExpoNotificationsMock.mockResolvedValueOnce({
      getPermissionsAsync: vi.fn().mockResolvedValue({ status: "granted" }),
      requestPermissionsAsync: vi.fn(),
      getExpoPushTokenAsync: vi.fn().mockResolvedValue({ data: "ExponentPushToken[abc]" }),
    });
    postMock.mockResolvedValueOnce({ data: {} });

    await registerExpoPushToken("token-1");

    expect(postMock).toHaveBeenCalledWith(
      "/front/user/push-token",
      {
        expoPushToken: "ExponentPushToken[abc]",
        platform: "ios",
        categories: ["RESTOCK", "PITY", "MARKETPLACE"],
      },
      { headers: { token: "token-1" } },
    );
    expect(trackEventMock).toHaveBeenCalledWith("push_token_registered", { platform: "ios" });
  });

  it("tracks denial when permission not granted", async () => {
    loadExpoNotificationsMock.mockResolvedValueOnce({
      getPermissionsAsync: vi.fn().mockResolvedValue({ status: "undetermined" }),
      requestPermissionsAsync: vi.fn().mockResolvedValue({ status: "denied" }),
      getExpoPushTokenAsync: vi.fn(),
    });

    await registerExpoPushToken("token-1");

    expect(postMock).not.toHaveBeenCalled();
    expect(trackEventMock).toHaveBeenCalledWith("notification_permission_denied", { status: "denied" });
  });

  it("tracks failure when token empty", async () => {
    loadExpoNotificationsMock.mockResolvedValueOnce({
      getPermissionsAsync: vi.fn().mockResolvedValue({ status: "granted" }),
      requestPermissionsAsync: vi.fn(),
      getExpoPushTokenAsync: vi.fn().mockResolvedValue({ data: "" }),
    });

    await registerExpoPushToken("token-1");

    expect(postMock).not.toHaveBeenCalled();
    expect(trackEventMock).toHaveBeenCalledWith("push_token_register_fail", { reason: "empty_token" });
  });
});

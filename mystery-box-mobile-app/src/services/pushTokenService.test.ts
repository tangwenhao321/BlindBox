import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerExpoPushToken, unregisterExpoPushToken } from "./pushTokenService";

const { postMock, deleteMock, loadExpoNotificationsMock, trackEventMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  deleteMock: vi.fn(),
  loadExpoNotificationsMock: vi.fn(),
  trackEventMock: vi.fn(),
}));

vi.mock("../api", () => ({
  api: { post: postMock, delete: deleteMock },
  buildAuthHeaders: (token: string) => ({ token }),
  parseError: (error: unknown) => (error instanceof Error ? error.message : "error"),
}));

vi.mock("../utils/expoNotificationsGate", () => ({
  loadExpoNotifications: loadExpoNotificationsMock,
}));

vi.mock("../utils/analytics", () => ({
  trackEvent: trackEventMock,
}));

vi.mock("../utils/appVersion", () => ({
  getAppReleaseChannel: () => "production",
}));

vi.mock("expo-constants", () => ({
  default: {
    easConfig: { projectId: "proj-test-123" },
    expoConfig: { extra: { eas: { projectId: "proj-test-123" } } },
  },
}));

describe("pushTokenService", () => {
  beforeEach(() => {
    postMock.mockReset();
    deleteMock.mockReset();
    loadExpoNotificationsMock.mockReset();
    trackEventMock.mockReset();
  });

  it("no-ops when expo notifications unavailable", async () => {
    loadExpoNotificationsMock.mockResolvedValueOnce(null);
    await registerExpoPushToken("token-1");
    expect(postMock).not.toHaveBeenCalled();
  });

  it("registers push token with projectId when permission granted", async () => {
    const getExpoPushTokenAsync = vi.fn().mockResolvedValue({ data: "ExponentPushToken[abc]" });
    loadExpoNotificationsMock.mockResolvedValueOnce({
      getPermissionsAsync: vi.fn().mockResolvedValue({ status: "granted" }),
      requestPermissionsAsync: vi.fn(),
      getExpoPushTokenAsync,
    });
    postMock.mockResolvedValueOnce({ data: {} });

    await registerExpoPushToken("token-1");

    expect(getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: "proj-test-123" });
    expect(postMock).toHaveBeenCalledWith(
      "/front/user/push-token",
      {
        expoPushToken: "ExponentPushToken[abc]",
        platform: "ios",
        releaseChannel: "production",
        categories: ["RESTOCK", "PITY", "PROBABILITY_CHANGE", "MARKETPLACE"],
      },
      { headers: { token: "token-1" } },
    );
    expect(trackEventMock).toHaveBeenCalledWith("push_token_registered", {
      platform: "ios",
      releaseChannel: "production",
    });
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

  it("unregisters by device token only", async () => {
    loadExpoNotificationsMock
      .mockResolvedValueOnce({
        getExpoPushTokenAsync: vi.fn().mockResolvedValue({ data: "ExponentPushToken[abc]" }),
      })
      .mockResolvedValueOnce({
        setBadgeCountAsync: vi.fn(),
      });
    deleteMock.mockResolvedValueOnce({ data: {} });

    await unregisterExpoPushToken("token-1");

    expect(deleteMock).toHaveBeenCalledWith("/front/user/push-token", {
      headers: { token: "token-1" },
      params: { expoPushToken: "ExponentPushToken[abc]" },
    });
  });
});

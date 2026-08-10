import { describe, expect, it, vi } from "vitest";

vi.mock("expo", () => ({
  isRunningInExpoGo: vi.fn(() => true),
}));

describe("expoNotificationsGate", () => {
  it("skips loading expo-notifications in Expo Go", async () => {
    const { canUseExpoNotifications, loadExpoNotifications } = await import("./expoNotificationsGate");
    expect(canUseExpoNotifications()).toBe(false);
    await expect(loadExpoNotifications()).resolves.toBeNull();
  });
});

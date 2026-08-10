import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationsRead,
} from "./notificationService";

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock("../api", () => ({
  api: { get: getMock, post: postMock },
  buildAuthHeaders: (token: string) => ({ token }),
}));

describe("notificationService", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  it("fetches notifications", async () => {
    getMock.mockResolvedValueOnce({
      data: { result: [{ id: "n1", category: "ORDER", title: "Hi", body: "Body", refId: "o1", read: false, createdTime: "t" }] },
    });
    const rows = await fetchNotifications("token-1", 15);
    expect(rows).toHaveLength(1);
    expect(getMock).toHaveBeenCalledWith("/front/notifications", {
      params: { limit: 15 },
      headers: { token: "token-1" },
    });
  });

  it("returns empty notifications on error", async () => {
    getMock.mockRejectedValueOnce(new Error("network"));
    const rows = await fetchNotifications("token-1");
    expect(rows).toEqual([]);
  });

  it("fetches unread count", async () => {
    getMock.mockResolvedValueOnce({ data: { result: { count: 3 } } });
    const count = await fetchUnreadNotificationCount("token-1");
    expect(count).toBe(3);
  });

  it("returns zero unread count on error", async () => {
    getMock.mockRejectedValueOnce(new Error("network"));
    const count = await fetchUnreadNotificationCount("token-1");
    expect(count).toBe(0);
  });

  it("marks notifications read", async () => {
    postMock.mockResolvedValueOnce({ data: {} });
    await markNotificationsRead("token-1", ["n1", "n2"]);
    expect(postMock).toHaveBeenCalledWith("/front/notifications/mark-read", ["n1", "n2"], {
      headers: { token: "token-1" },
    });
  });

  it("skips mark-read when ids empty", async () => {
    await markNotificationsRead("token-1", []);
    expect(postMock).not.toHaveBeenCalled();
  });
});

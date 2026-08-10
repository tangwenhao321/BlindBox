import { beforeEach, describe, expect, it, vi } from "vitest";
import { uploadAnalyticsEvents, uploadGuestAnalyticsEvents } from "./analyticsService";

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }));

vi.mock("../api", () => ({
  api: { post: postMock },
  buildAuthHeaders: (token: string) => ({ token }),
}));

describe("analyticsService", () => {
  beforeEach(() => postMock.mockReset());

  it("uploadAnalyticsEvents posts events batch", async () => {
    postMock.mockResolvedValueOnce({ data: { result: 2 } });
    const count = await uploadAnalyticsEvents("tok", [
      { name: "view_box", at: "2026-01-01", payload: { boxId: "b1" } },
      { name: "click_buy", at: "2026-01-02", payload: {} },
    ]);
    expect(count).toBe(2);
    expect(postMock).toHaveBeenCalledWith("/front/analytics/events", expect.any(Array), expect.any(Object));
  });

  it("uploadGuestAnalyticsEvents skips empty", async () => {
    await expect(uploadGuestAnalyticsEvents([])).resolves.toBe(0);
    expect(postMock).not.toHaveBeenCalled();
  });

  it("uploadAnalyticsEvents skips empty", async () => {
    await expect(uploadAnalyticsEvents("tok", [])).resolves.toBe(0);
  });
});

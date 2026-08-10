import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchActiveActivities, fetchActivityDetail } from "./activityService";

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock("../api", () => ({
  api: { get: getMock },
}));

describe("activityService", () => {
  beforeEach(() => getMock.mockReset());

  it("fetchActiveActivities returns result list", async () => {
    getMock.mockResolvedValueOnce({
      data: { result: [{ id: "a1", title: "限时活动", banner: null, subtitle: null, endTime: "2026-12-31", boxIds: [] }] },
    });
    const list = await fetchActiveActivities();
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe("a1");
  });

  it("fetchActiveActivities returns empty on error", async () => {
    getMock.mockRejectedValueOnce(new Error("network"));
    await expect(fetchActiveActivities()).resolves.toEqual([]);
  });

  it("fetchActivityDetail returns detail or null", async () => {
    getMock.mockResolvedValueOnce({
      data: { result: { id: "a1", title: "活动", banner: null, subtitle: null, endTime: "2026-12-31", boxIds: [], boxes: [] } },
    });
    const detail = await fetchActivityDetail("a1");
    expect(detail?.boxes).toEqual([]);
  });
});

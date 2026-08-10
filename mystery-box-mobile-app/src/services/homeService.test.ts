import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchHomeSummary, fetchHomeRecommend } from "./homeService";

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock("../api", () => ({
  api: { get: getMock },
}));

describe("homeService", () => {
  beforeEach(() => getMock.mockReset());

  it("fetchHomeSummary returns summary", async () => {
    getMock.mockResolvedValueOnce({
      data: { todayDrawCount: 5, todayLegendaryCount: 1, hotBoxes: [], recommendBoxIds: ["b1"] },
    });
    const summary = await fetchHomeSummary();
    expect(summary?.todayDrawCount).toBe(5);
  });

  it("fetchHomeRecommend returns ids", async () => {
    getMock.mockResolvedValueOnce({ data: { result: ["a", "b"] } });
    await expect(fetchHomeRecommend()).resolves.toEqual(["a", "b"]);
  });
});

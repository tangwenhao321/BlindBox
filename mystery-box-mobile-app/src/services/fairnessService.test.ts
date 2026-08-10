import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchSeriesDrawStatistics, verifyFairnessByOrder } from "./fairnessService";

const { getMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
}));

vi.mock("../api", () => ({
  api: { get: getMock },
}));

describe("fairnessService", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it("verifyFairnessByOrder returns array payload", async () => {
    getMock.mockResolvedValueOnce({
      data: [{ drawLogId: "log-1", orderId: "ord-1", verified: true }],
    });
    const rows = await verifyFairnessByOrder("ord-1");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.verified).toBe(true);
  });

  it("fetchSeriesDrawStatistics unwraps statistics", async () => {
    getMock.mockResolvedValueOnce({
      data: {
        mysteryBoxId: "box-1",
        mysteryBoxName: "Series A",
        totalDraws: 120,
        configuredLegendaryRate: 0.01,
        configuredHiddenRate: 0.05,
        configuredGeneralRate: 0.94,
        tiers: [{ qualityType: "LEGENDARY", count: 2, actualPercent: 1.6 }],
      },
    });
    const stats = await fetchSeriesDrawStatistics("box-1");
    expect(stats.totalDraws).toBe(120);
    expect(stats.tiers[0]?.qualityType).toBe("LEGENDARY");
  });
});

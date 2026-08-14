import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchDailyBeacon, fetchSeriesDrawStatistics, verifyFairnessByOrder } from "./fairnessService";

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

  it("fetchDailyBeacon unwraps direct and result payloads", async () => {
    getMock.mockResolvedValueOnce({
      data: { dayUtc: "2026-08-14", beacon: "abc123def456" },
    });
    const direct = await fetchDailyBeacon();
    expect(direct?.dayUtc).toBe("2026-08-14");
    expect(direct?.beacon).toBe("abc123def456");

    getMock.mockResolvedValueOnce({
      data: { result: { dayUtc: "2026-08-15", beacon: "nested-beacon" } },
    });
    const nested = await fetchDailyBeacon();
    expect(nested?.beacon).toBe("nested-beacon");
  });
});

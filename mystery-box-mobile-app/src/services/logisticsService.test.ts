import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchOrderLogistics, fetchOrderTracking, fetchWarehouseShipTracking } from "./logisticsService";

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock("../api", () => ({
  api: { get: getMock },
  buildAuthHeaders: (token: string) => ({ token }),
}));

describe("logisticsService", () => {
  beforeEach(() => getMock.mockReset());

  it("fetchOrderTracking unwraps result envelope", async () => {
    getMock.mockResolvedValueOnce({
      data: {
        result: {
          events: [{ status: "SHIPPED", description: "已发货" }],
          latestStatus: "SHIPPED",
          liveProvider: true,
        },
      },
    });
    const tracking = await fetchOrderTracking("tok", "ord-1");
    expect(tracking.latestStatus).toBe("SHIPPED");
    expect(tracking.events).toHaveLength(1);
  });

  it("fetchOrderLogistics returns events array", async () => {
    getMock.mockResolvedValueOnce({
      data: { events: [{ status: "DELIVERED", description: "已签收" }], latestStatus: "DELIVERED", liveProvider: false },
    });
    const events = await fetchOrderLogistics("tok", "ord-2");
    expect(events[0]?.status).toBe("DELIVERED");
  });

  it("fetchWarehouseShipTracking falls back on empty result", async () => {
    getMock.mockResolvedValueOnce({ data: {} });
    const tracking = await fetchWarehouseShipTracking("tok", "req-1");
    expect(tracking.events).toEqual([]);
    expect(tracking.latestStatus).toBe("UNKNOWN");
  });
});

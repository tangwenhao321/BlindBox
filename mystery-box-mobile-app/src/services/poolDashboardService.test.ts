import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPoolDashboard } from "./poolDashboardService";

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock("../api", () => ({
  api: { get: getMock },
  buildAuthHeaders: (token: string) => ({ token }),
}));

describe("poolDashboardService", () => {
  beforeEach(() => getMock.mockReset());

  it("fetchPoolDashboard returns dashboard", async () => {
    getMock.mockResolvedValueOnce({
      data: {
        result: {
          poolTotal: 100,
          poolRemaining: 40,
          tiers: [{ qualityType: "LEGENDARY", total: 10, remaining: 2 }],
          lastOne: null,
        },
      },
    });
    const dash = await fetchPoolDashboard("tok", "box-1");
    expect(dash?.poolRemaining).toBe(40);
  });

  it("fetchPoolDashboard returns null on error", async () => {
    getMock.mockRejectedValueOnce(new Error("fail"));
    await expect(fetchPoolDashboard("tok", "box-1")).resolves.toBeNull();
  });
});

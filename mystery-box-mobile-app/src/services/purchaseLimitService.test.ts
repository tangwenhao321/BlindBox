import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchPurchaseLimit } from "./purchaseLimitService";

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock("../api", () => ({
  api: { get: getMock },
  buildAuthHeaders: (token: string) => ({ token }),
}));

describe("purchaseLimitService", () => {
  beforeEach(() => getMock.mockReset());

  it("fetchPurchaseLimit unwraps direct payload", async () => {
    getMock.mockResolvedValueOnce({ data: { maxPerDay: 10, usedToday: 2, remainingToday: 8 } });
    const status = await fetchPurchaseLimit("tok", "box-1");
    expect(status.remainingToday).toBe(8);
  });

  it("fetchPurchaseLimit unwraps result envelope", async () => {
    getMock.mockResolvedValueOnce({ data: { result: { maxPerDay: 5, usedToday: 5, remainingToday: 0 } } });
    const status = await fetchPurchaseLimit("tok", "box-2");
    expect(status.remainingToday).toBe(0);
  });
});

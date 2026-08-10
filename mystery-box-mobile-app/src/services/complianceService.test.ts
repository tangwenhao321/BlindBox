import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  confirmAgeCompliance,
  fetchAgeCompliance,
  fetchSpendLimit,
  updateSpendLimitPreference,
} from "./complianceService";

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock("../api", () => ({
  api: { get: getMock, post: postMock },
  buildAuthHeaders: (token: string) => ({ token }),
}));

describe("complianceService", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  it("fetchSpendLimit unwraps result", async () => {
    getMock.mockResolvedValueOnce({
      data: {
        result: {
          enabled: true,
          dailyLimit: 500,
          dailySpent: 100,
          dailyRemaining: 400,
          monthlyLimit: 2000,
          monthlySpent: 300,
          monthlyRemaining: 1700,
          withinLimits: true,
          userDailyLimit: 300,
          inCoolingOff: false,
        },
      },
    });
    const view = await fetchSpendLimit("tok");
    expect(view.dailyRemaining).toBe(400);
    expect(view.userDailyLimit).toBe(300);
    expect(view.withinLimits).toBe(true);
  });

  it("updateSpendLimitPreference posts preference", async () => {
    postMock.mockResolvedValueOnce({
      data: {
        result: {
          enabled: true,
          dailyLimit: 200,
          dailySpent: 0,
          dailyRemaining: 200,
          monthlyLimit: 1000,
          monthlySpent: 0,
          monthlyRemaining: 1000,
          withinLimits: true,
          inCoolingOff: true,
          coolingOffUntil: "2026-05-26T00:00:00",
        },
      },
    });
    const view = await updateSpendLimitPreference("tok", { dailyLimit: 200, monthlyLimit: 1000 });
    expect(view.inCoolingOff).toBe(true);
    expect(postMock).toHaveBeenCalledWith(
      "/front/user/compliance/spend-limit/preference",
      { dailyLimit: 200, monthlyLimit: 1000 },
      { headers: { token: "tok" } },
    );
  });

  it("fetchAgeCompliance returns confirmed flag", async () => {
    getMock.mockResolvedValueOnce({ data: { confirmed: true } });
    await expect(fetchAgeCompliance("tok")).resolves.toBe(true);
  });

  it("confirmAgeCompliance posts confirm endpoint", async () => {
    postMock.mockResolvedValueOnce({});
    await confirmAgeCompliance("tok");
    expect(postMock).toHaveBeenCalledWith(
      "/front/user/compliance/confirm-age",
      {},
      { headers: { token: "tok" } },
    );
  });
});

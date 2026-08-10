import { beforeEach, describe, expect, it, vi } from "vitest";
import { getReferralStats, bindInviteCode } from "./referralService";

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock("../api", () => ({
  api: { get: getMock, post: postMock },
  buildAuthHeaders: (token: string) => ({ token }),
}));

describe("referralService", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  it("getReferralStats returns stats", async () => {
    getMock.mockResolvedValueOnce({
      data: { result: { inviteCode: "ABC", invitedCount: 2, totalCommission: 10, luckyCoins: 0, starStones: 0, level2Count: 0 } },
    });
    const stats = await getReferralStats("tok");
    expect(stats?.inviteCode).toBe("ABC");
  });

  it("bindInviteCode posts code", async () => {
    postMock.mockResolvedValueOnce({ data: { result: true } });
    await bindInviteCode("tok", "INV123");
    expect(postMock).toHaveBeenCalledWith(
      "/front/referral/bind",
      { inviteCode: "INV123" },
      { headers: { token: "tok" } },
    );
  });
});

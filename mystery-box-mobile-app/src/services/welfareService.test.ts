import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkIn, getCheckInStatus, toggleFavorite } from "./welfareService";

const { getMock, postMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
  postMock: vi.fn(),
}));

vi.mock("../api", () => ({
  api: { get: getMock, post: postMock },
  buildAuthHeaders: (token: string) => ({ token }),
}));

describe("welfareService", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  it("getCheckInStatus returns result", async () => {
    getMock.mockResolvedValueOnce({
      data: { result: { checkedToday: false, luckyCoins: 10, starStones: 0, todayRewardCoins: 5 } },
    });
    const status = await getCheckInStatus("tok");
    expect(status?.checkedToday).toBe(false);
    expect(status?.luckyCoins).toBe(10);
  });

  it("checkIn posts and returns status", async () => {
    postMock.mockResolvedValueOnce({
      data: { result: { checkedToday: true, luckyCoins: 15, starStones: 0, todayRewardCoins: 5 } },
    });
    const status = await checkIn("tok");
    expect(status?.checkedToday).toBe(true);
  });

  it("toggleFavorite returns boolean result", async () => {
    postMock.mockResolvedValueOnce({ data: { result: true } });
    await expect(toggleFavorite("tok", "box-9")).resolves.toBe(true);
  });
});

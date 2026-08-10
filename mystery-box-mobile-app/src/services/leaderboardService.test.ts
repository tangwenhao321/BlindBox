import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchLeaderboardMe, fetchLeaderboardPage, fetchWeeklyLeaderboard } from "./leaderboardService";

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock("../api", () => ({
  api: { get: getMock },
  buildAuthHeaders: (token: string) => ({ token }),
}));

describe("leaderboardService", () => {
  beforeEach(() => getMock.mockReset());

  it("fetchLeaderboardMe returns result", async () => {
    getMock.mockResolvedValueOnce({
      data: { result: { rank: 3, highCount: 5, title: "欧皇", onBoard: true } },
    });
    const me = await fetchLeaderboardMe("tok", "box-1");
    expect(me?.rank).toBe(3);
  });

  it("fetchLeaderboardPage returns paginated items", async () => {
    getMock.mockResolvedValueOnce({
      data: { result: { items: [{ nickname: "A", highCount: 1 }], page: 0, size: 20, total: 1, hasMore: false } },
    });
    const page = await fetchLeaderboardPage("box-1", "week", 0, 20);
    expect(page.items).toHaveLength(1);
  });

  it("fetchWeeklyLeaderboard maps page items", async () => {
    getMock.mockResolvedValueOnce({
      data: { result: { items: [{ nickname: "B", highCount: 2 }], page: 0, size: 20, total: 1, hasMore: false } },
    });
    const items = await fetchWeeklyLeaderboard();
    expect(items[0]?.nickname).toBe("B");
  });
});

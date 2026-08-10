import { api, buildAuthHeaders } from "../api";

export type LeaderboardMe = {
  rank: number;
  highCount: number;
  title: string;
  onBoard: boolean;
};

export type LeaderboardEntry = {
  rank: number;
  nickname: string;
  highCount: number;
};

export type LeaderboardPage = {
  items: LeaderboardEntry[];
  page: number;
  size: number;
  total: number;
  hasMore: boolean;
};

export async function fetchLeaderboardMe(token: string, mysteryBoxId?: string): Promise<LeaderboardMe | null> {
  try {
    const response = await api.get<{ result: LeaderboardMe }>("/front/leaderboard/me", {
      params: { mysteryBoxId },
      headers: buildAuthHeaders(token),
    });
    return response.data.result;
  } catch {
    return null;
  }
}

export async function fetchWeeklyLeaderboard(mysteryBoxId?: string): Promise<LeaderboardEntry[]> {
  const page = await fetchLeaderboardPage(mysteryBoxId, "week", 0, 20);
  return page.items;
}

export async function fetchLeaderboardPage(
  mysteryBoxId?: string,
  period: "week" | "month" = "week",
  page = 0,
  size = 20,
): Promise<LeaderboardPage> {
  try {
    const response = await api.get<{ result: LeaderboardPage }>("/front/leaderboard", {
      params: { mysteryBoxId, period, page, size },
    });
    const result = response.data.result;
    return (
      result ?? {
        items: [],
        page,
        size,
        total: 0,
        hasMore: false,
      }
    );
  } catch {
    return { items: [], page, size, total: 0, hasMore: false };
  }
}

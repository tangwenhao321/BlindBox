import { api, buildAuthHeaders } from "../api";
import type { ApiResult } from "../types";

export type WeekDayCheckIn = {
  date: string;
  checked: boolean;
};

export type CheckInStatus = {
  checkedToday: boolean;
  luckyCoins: number;
  starStones: number;
  todayRewardCoins: number;
  streakDays?: number;
  weekCalendar?: WeekDayCheckIn[];
};
export async function getCheckInStatus(token: string) {
  const response = await api.get<ApiResult<CheckInStatus>>("/front/welfare/check-in/status", {
    headers: buildAuthHeaders(token),
  });
  return response.data.result;
}

export async function checkIn(token: string) {
  const response = await api.post<ApiResult<CheckInStatus>>(
    "/front/welfare/check-in",
    {},
    { headers: buildAuthHeaders(token) },
  );
  return response.data.result;
}

export async function listFavoriteBoxIds(token: string) {
  const response = await api.get<ApiResult<string[]>>("/front/welfare/favorites", {
    headers: buildAuthHeaders(token),
  });
  return response.data.result ?? [];
}

export async function toggleFavorite(token: string, mysteryBoxId: string) {
  const response = await api.post<ApiResult<boolean>>(
    `/front/welfare/favorites/${mysteryBoxId}/toggle`,
    {},
    { headers: buildAuthHeaders(token) },
  );
  return response.data.result;
}

export type LuckyCoinLedgerEntry = {
  id: string;
  amount: number;
  remark: string;
  createdTime: string;
};

export async function fetchLuckyCoinLedger(token: string, page = 0, size = 20): Promise<LuckyCoinLedgerEntry[]> {
  if (!token) return [];
  const response = await api.get<ApiResult<{ items?: LuckyCoinLedgerEntry[] }>>("/front/welfare/lucky-coins/ledger", {
    params: { page, size },
    headers: buildAuthHeaders(token),
  });
  return response.data.result?.items ?? [];
}

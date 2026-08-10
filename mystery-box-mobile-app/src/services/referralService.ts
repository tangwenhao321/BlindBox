import { api, buildAuthHeaders } from "../api";
import { DEFAULT_QUERY_PAGE_NUM, DEFAULT_QUERY_PAGE_SIZE } from "../config/constants";
import type { ApiResult, QueryResult } from "../types";

export type ReferralStats = {
  inviteCode: string;
  invitedCount: number;
  level2Count: number;
  totalCommission: number;
  luckyCoins: number;
  starStones: number;
};

export type CommissionRecord = {
  id: string;
  amount: number;
  remark: string;
  orderId?: string;
  createdTime?: string;
  sourceUser?: { nickname?: string; phone?: string };
};

export type TeamMember = {
  userId: string;
  nickname?: string;
  phone?: string;
  joinedAt?: string;
};

export type ReferralMilestones = {
  invitedCount: number;
  tiers: { targetCount: number; label: string; reached: boolean; rewardCoins: number; claimed: boolean }[];
};

export async function fetchReferralMilestones(token: string) {
  const response = await api.get<ApiResult<ReferralMilestones>>("/front/referral/milestones", {
    headers: buildAuthHeaders(token),
  });
  return response.data.result;
}

export async function getReferralStats(token: string) {
  const response = await api.get<ApiResult<ReferralStats>>("/front/referral/stats", {
    headers: buildAuthHeaders(token),
  });
  return response.data.result;
}

export async function queryCommissionRecords(
  token: string,
  pageNum = DEFAULT_QUERY_PAGE_NUM,
  pageSize = DEFAULT_QUERY_PAGE_SIZE,
) {
  const response = await api.post<ApiResult<QueryResult<CommissionRecord>>>(
    "/front/referral/commissions/query",
    { pageNum, pageSize, query: {} },
    { headers: buildAuthHeaders(token) },
  );
  return response.data.result.content ?? [];
}

export async function getTeamMembers(token: string, level: 1 | 2 = 1) {
  const response = await api.get<ApiResult<TeamMember[]>>("/front/referral/team", {
    params: { level },
    headers: buildAuthHeaders(token),
  });
  return response.data.result ?? [];
}

export async function bindInviteCode(token: string, inviteCode: string) {
  await api.post<ApiResult<boolean>>(
    "/front/referral/bind",
    { inviteCode },
    { headers: buildAuthHeaders(token) },
  );
}

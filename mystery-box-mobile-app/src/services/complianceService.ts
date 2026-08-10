import { api, buildAuthHeaders } from "../api";

import type { ApiResult } from "../types";



export type SpendLimitView = {

  enabled: boolean;

  dailyLimit: number | null;

  dailySpent: number | null;

  dailyRemaining: number | null;

  monthlyLimit: number | null;

  monthlySpent: number | null;

  monthlyRemaining: number | null;

  withinLimits: boolean;

  serverDailyLimit?: number | null;

  serverMonthlyLimit?: number | null;

  userDailyLimit?: number | null;

  userMonthlyLimit?: number | null;

  coolingOffUntil?: string | null;

  inCoolingOff?: boolean;

};



function toNumber(value: unknown): number | null {

  if (value == null) return null;

  const n = Number(value);

  return Number.isFinite(n) ? n : null;

}



function normalizeSpendLimit(raw: Record<string, unknown>): SpendLimitView {

  return {

    enabled: Boolean(raw.enabled),

    dailyLimit: toNumber(raw.dailyLimit),

    dailySpent: toNumber(raw.dailySpent),

    dailyRemaining: toNumber(raw.dailyRemaining),

    monthlyLimit: toNumber(raw.monthlyLimit),

    monthlySpent: toNumber(raw.monthlySpent),

    monthlyRemaining: toNumber(raw.monthlyRemaining),

    withinLimits: raw.withinLimits !== false,

    serverDailyLimit: toNumber(raw.serverDailyLimit),

    serverMonthlyLimit: toNumber(raw.serverMonthlyLimit),

    userDailyLimit: toNumber(raw.userDailyLimit),

    userMonthlyLimit: toNumber(raw.userMonthlyLimit),

    coolingOffUntil: typeof raw.coolingOffUntil === "string" ? raw.coolingOffUntil : null,

    inCoolingOff: Boolean(raw.inCoolingOff),

  };

}



export async function fetchSpendLimit(token: string): Promise<SpendLimitView> {

  const response = await api.get<ApiResult<SpendLimitView> | SpendLimitView>(

    "/front/user/compliance/spend-limit",

    { headers: buildAuthHeaders(token) },

  );

  const data = response.data;

  if (data && typeof data === "object" && "result" in data && data.result) {

    return normalizeSpendLimit(data.result as Record<string, unknown>);

  }

  return normalizeSpendLimit(data as Record<string, unknown>);

}



export async function updateSpendLimitPreference(

  token: string,

  payload: { dailyLimit?: number; monthlyLimit?: number },

): Promise<SpendLimitView> {

  const response = await api.post<ApiResult<SpendLimitView> | SpendLimitView>(

    "/front/user/compliance/spend-limit/preference",

    payload,

    { headers: buildAuthHeaders(token) },

  );

  const data = response.data;

  if (data && typeof data === "object" && "result" in data && data.result) {

    return normalizeSpendLimit(data.result as Record<string, unknown>);

  }

  return normalizeSpendLimit(data as Record<string, unknown>);

}



export async function fetchAgeCompliance(token: string): Promise<boolean> {

  const response = await api.get<ApiResult<{ confirmed: boolean }> | { confirmed: boolean }>(

    "/front/user/compliance/age",

    { headers: buildAuthHeaders(token) },

  );

  const data = response.data;

  if (data && typeof data === "object" && "result" in data && data.result) {

    return Boolean((data.result as { confirmed?: boolean }).confirmed);

  }

  return Boolean((data as { confirmed?: boolean }).confirmed);

}



export async function confirmAgeCompliance(token: string): Promise<void> {

  await api.post("/front/user/compliance/confirm-age", {}, { headers: buildAuthHeaders(token) });

}


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
  ageTier?: string | null;
  minor?: boolean;
  identityVerified?: boolean;
  purchaseAllowed?: boolean;
  audioVolumeScale?: number | null;
  hardDailyCapMinor?: number | null;
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
    ageTier: typeof raw.ageTier === "string" ? raw.ageTier : null,
    minor: Boolean(raw.minor),
    identityVerified: Boolean(raw.identityVerified),
    purchaseAllowed: raw.purchaseAllowed !== false,
    audioVolumeScale: toNumber(raw.audioVolumeScale),
    hardDailyCapMinor: toNumber(raw.hardDailyCapMinor),
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

export async function confirmAgeCompliance(token: string, birthYear?: number): Promise<void> {
  await api.post(
    "/front/user/compliance/confirm-age",
    birthYear != null ? { birthYear } : {},
    { headers: buildAuthHeaders(token) },
  );
}

export type IdentityStatus = {
  verified: boolean;
  ageTier: string;
  minor: boolean;
  purchaseAllowed: boolean;
  audioVolumeScale: number;
  maskedIdNumber?: string;
  hardDailyCapMinor?: string;
};

export async function fetchIdentityStatus(token: string): Promise<IdentityStatus | null> {
  if (!token) return null;
  const response = await api.get<ApiResult<IdentityStatus> | IdentityStatus>(
    "/front/user/compliance/identity",
    { headers: buildAuthHeaders(token) },
  );
  const data = response.data;
  const raw =
    data && typeof data === "object" && "result" in data && data.result
      ? (data.result as IdentityStatus)
      : (data as IdentityStatus);
  if (!raw || typeof raw !== "object") return null;
  return {
    verified: Boolean(raw.verified),
    ageTier: String(raw.ageTier ?? "ADULT"),
    minor: Boolean(raw.minor),
    purchaseAllowed: raw.purchaseAllowed !== false,
    audioVolumeScale:
      typeof raw.audioVolumeScale === "number" && Number.isFinite(raw.audioVolumeScale)
        ? raw.audioVolumeScale
        : 1,
    maskedIdNumber: typeof raw.maskedIdNumber === "string" ? raw.maskedIdNumber : undefined,
    hardDailyCapMinor: typeof raw.hardDailyCapMinor === "string" ? raw.hardDailyCapMinor : undefined,
  };
}

export async function verifyIdentity(
  token: string,
  payload: { documentNumber: string; fullName?: string },
): Promise<IdentityStatus> {
  const response = await api.post<ApiResult<Record<string, unknown>> | Record<string, unknown>>(
    "/front/user/compliance/identity/verify",
    {
      documentNumber: payload.documentNumber,
      fullName: payload.fullName,
      idNumber: payload.documentNumber,
      realName: payload.fullName,
    },
    { headers: buildAuthHeaders(token) },
  );
  const data = response.data;
  const raw =
    data && typeof data === "object" && "result" in data && data.result
      ? (data.result as Record<string, unknown>)
      : (data as Record<string, unknown>);
  return {
    verified: true,
    ageTier: String(raw.ageTier ?? "ADULT"),
    minor: String(raw.ageTier ?? "").toUpperCase() !== "ADULT",
    purchaseAllowed: String(raw.ageTier ?? "").toUpperCase() !== "CHILD",
    audioVolumeScale: 1,
    maskedIdNumber: typeof raw.maskedIdNumber === "string" ? raw.maskedIdNumber : undefined,
  };
}

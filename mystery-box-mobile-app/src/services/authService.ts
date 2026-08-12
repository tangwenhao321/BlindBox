import { api, ApiClientError, buildAuthHeaders } from "../api";
import i18n from "../i18n";
import type { ApiResult, TokenInfo, UserBalanceLog, UserProfile } from "../types";

function readAuthToken(result: TokenInfo | undefined, actionKey: string) {
  const token = result?.tokenValue?.trim();
  if (!token) {
    throw new ApiClientError(i18n.t("auth.noToken", { action: i18n.t(actionKey) }));
  }
  return token;
}

export async function loginByPhone(phone: string, password: string) {
  const response = await api.post<ApiResult<TokenInfo>>("/front/user/login", { phone, password });
  return readAuthToken(response.data.result, "auth.actionLogin");
}

export async function loginBySms(phone: string, code: string) {
  const response = await api.post<ApiResult<TokenInfo>>("/front/user/login/sms", { phone, code });
  return readAuthToken(response.data.result, "auth.actionLogin");
}

export type ZaloLoginPayload =
  | { code: string; codeVerifier?: string; accessToken?: never; inviteCode?: string }
  | { accessToken: string; code?: never; codeVerifier?: never; inviteCode?: string };

export async function loginByZalo(payload: ZaloLoginPayload) {
  const inviteCode = payload.inviteCode?.trim() || undefined;
  const body =
    "accessToken" in payload && payload.accessToken
      ? { accessToken: payload.accessToken, inviteCode }
      : { code: payload.code, codeVerifier: payload.codeVerifier, inviteCode };
  const response = await api.post<ApiResult<TokenInfo>>("/front/auth/zalo/login", body);
  return readAuthToken(response.data.result, "auth.actionLogin");
}

export type ZaloAuthPublicConfig = {
  enabled: boolean;
  appId?: string | null;
  authorizationUrl?: string | null;
};

export async function fetchZaloAuthConfig() {
  const response = await api.get<ApiResult<ZaloAuthPublicConfig>>("/front/auth/zalo/config");
  return response.data.result;
}

export async function registerByPhone(phone: string, password: string, code: string, inviteCode?: string) {
  const response = await api.post<ApiResult<TokenInfo>>("/front/user/register", {
    phone,
    password,
    code,
    // Backend Jimmer DTO requires the field when read; always send (empty = no inviter).
    inviteCode: inviteCode?.trim() ?? "",
  });
  return readAuthToken(response.data.result, "auth.actionRegister");
}

export async function getCurrentUserInfo(token: string) {
  const response = await api.get<ApiResult<UserProfile>>("/front/user/info", {
    headers: buildAuthHeaders(token),
  });
  return response.data.result;
}

export async function updateUserInfo(token: string, payload: { nickname?: string; gender?: string; avatar?: string }) {
  const response = await api.post<ApiResult<string>>("/front/user/info", payload, {
    headers: buildAuthHeaders(token),
  });
  return response.data.result;
}

/** Bind a real phone onto a Zalo account that still uses a synthetic zalo: phone. */
export async function bindUserPhone(token: string, phone: string, code: string) {
  await api.post("/front/user/bind-phone", { phone, code }, {
    headers: buildAuthHeaders(token),
  });
}

export async function resetPassword(phone: string, password: string, code: string) {
  const response = await api.put<ApiResult<TokenInfo>>("/front/user/password", { phone, password, code });
  return response.data.result.tokenValue;
}

/** Request SMS OTP for register / password reset (anonymous). */
export async function sendAuthSms(phone: string) {
  const response = await api.post<ApiResult<boolean> | boolean>("/front/auth/sms/send", null, {
    params: { phone },
  });
  const data = response.data;
  if (typeof data === "boolean") {
    return data;
  }
  return Boolean((data as ApiResult<boolean>)?.result ?? true);
}

export async function queryUserBalanceLogs(token: string, limit = 20) {
  const response = await api.get<ApiResult<UserBalanceLog[]>>("/front/user/balance/logs", {
    params: { limit },
    headers: buildAuthHeaders(token),
  });
  return response.data.result ?? [];
}

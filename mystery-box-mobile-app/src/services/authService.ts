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

export async function resetPassword(phone: string, password: string, code: string) {
  const response = await api.put<ApiResult<TokenInfo>>("/front/user/password", { phone, password, code });
  return response.data.result.tokenValue;
}

export async function queryUserBalanceLogs(token: string, limit = 20) {
  const response = await api.get<ApiResult<UserBalanceLog[]>>("/front/user/balance/logs", {
    params: { limit },
    headers: buildAuthHeaders(token),
  });
  return response.data.result ?? [];
}

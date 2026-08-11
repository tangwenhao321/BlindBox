import { api, buildAuthHeaders } from "../api";
import type { ApiResult } from "../types";

export type PrivacyExportDump = {
  exportedAt?: string;
  profile?: Record<string, unknown>;
  orders?: Array<Record<string, unknown>>;
  addresses?: Array<Record<string, unknown>>;
};

export type DeleteAccountResult = {
  deleted: boolean;
  userId?: string;
  code?: string;
};

function unwrap<T>(data: ApiResult<T> | T): T {
  if (data && typeof data === "object" && "result" in data && (data as ApiResult<T>).result != null) {
    return (data as ApiResult<T>).result as T;
  }
  return data as T;
}

export async function exportPrivacyData(token: string): Promise<PrivacyExportDump> {
  const response = await api.get<ApiResult<PrivacyExportDump> | PrivacyExportDump>(
    "/front/user/privacy/export",
    { headers: buildAuthHeaders(token) },
  );
  return unwrap(response.data) ?? {};
}

export async function requestAccountDeletion(token: string): Promise<DeleteAccountResult> {
  const response = await api.post<ApiResult<DeleteAccountResult> | DeleteAccountResult>(
    "/front/user/privacy/delete-request",
    {},
    { headers: buildAuthHeaders(token) },
  );
  const raw = unwrap(response.data);
  return {
    deleted: Boolean(raw?.deleted),
    userId: typeof raw?.userId === "string" ? raw.userId : undefined,
    code: typeof raw?.code === "string" ? raw.code : undefined,
  };
}

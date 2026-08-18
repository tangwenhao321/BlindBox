import { api, buildAuthHeaders } from "../api";
import type { ApiResult } from "../types";

export type RemoteThemeProgress = {
  openCount: number;
  hasHidden: boolean;
  seriesComplete: boolean;
  equippedThemeId: string | null;
};

function unwrapResult<T>(data: ApiResult<T> | T): T {
  if (data && typeof data === "object" && "result" in data && (data as ApiResult<T>).result != null) {
    return (data as ApiResult<T>).result as T;
  }
  return data as T;
}

function mapProgress(payload: Partial<RemoteThemeProgress> | null | undefined): RemoteThemeProgress | null {
  if (!payload || typeof payload !== "object") return null;
  return {
    openCount: Math.max(0, Number(payload.openCount ?? 0) || 0),
    hasHidden: !!payload.hasHidden,
    seriesComplete: !!payload.seriesComplete,
    equippedThemeId: payload.equippedThemeId?.trim() || null,
  };
}

export async function fetchThemeProgress(token: string): Promise<RemoteThemeProgress | null> {
  try {
    const response = await api.get<ApiResult<RemoteThemeProgress> | RemoteThemeProgress>(
      "/front/reveal/theme-progress",
      { headers: buildAuthHeaders(token) },
    );
    return mapProgress(unwrapResult(response.data));
  } catch {
    return null;
  }
}

export async function recordThemeProgressOpen(
  token: string,
  orderId: string,
  flags: { hasHidden?: boolean; seriesComplete?: boolean },
): Promise<RemoteThemeProgress | null> {
  try {
    const response = await api.post<ApiResult<RemoteThemeProgress> | RemoteThemeProgress>(
      "/front/reveal/theme-progress",
      {
        orderId,
        hasHidden: !!flags.hasHidden,
        seriesComplete: !!flags.seriesComplete,
      },
      { headers: buildAuthHeaders(token) },
    );
    return mapProgress(unwrapResult(response.data));
  } catch {
    return null;
  }
}

export async function saveEquippedThemeRemote(
  token: string,
  equippedThemeId: string | null,
): Promise<RemoteThemeProgress | null> {
  try {
    const response = await api.put<ApiResult<RemoteThemeProgress> | RemoteThemeProgress>(
      "/front/reveal/theme-progress/equipped",
      { equippedThemeId },
      { headers: buildAuthHeaders(token) },
    );
    return mapProgress(unwrapResult(response.data));
  } catch {
    return null;
  }
}

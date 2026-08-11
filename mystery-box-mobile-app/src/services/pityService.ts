import { api, buildAuthHeaders } from "../api";

export type PityProgress = {
  current: number;
  threshold: number;
  remaining: number;
  compensateStatus?: string | null;
};

function normalizePityProgress(raw: Partial<PityProgress> | null | undefined): PityProgress | null {
  if (!raw || typeof raw.current !== "number" || typeof raw.threshold !== "number") {
    return null;
  }
  const remaining =
    typeof raw.remaining === "number" ? raw.remaining : Math.max(0, raw.threshold - raw.current);
  return {
    current: raw.current,
    threshold: raw.threshold,
    remaining,
    compensateStatus: typeof raw.compensateStatus === "string" ? raw.compensateStatus : null,
  };
}

export async function fetchPityProgress(token: string, boxId: string): Promise<PityProgress | null> {
  const response = await api.get<{ result?: PityProgress } & PityProgress>(
    `/front/mystery-box/${boxId}/pity-progress`,
    {
      headers: buildAuthHeaders(token),
    },
  );
  return normalizePityProgress(response.data.result ?? response.data);
}

export async function submitPityCompensate(
  token: string,
  boxId: string,
  choice: "WAIT" | "POINTS",
): Promise<{ choice: string; pointsGranted: number; message: string } | null> {
  try {
    const response = await api.post<{
      result?: { choice: string; pointsGranted: number; message: string };
    }>(`/front/mystery-box/${boxId}/pity-compensate`, { choice }, { headers: buildAuthHeaders(token) });
    return response.data.result ?? null;
  } catch {
    return null;
  }
}

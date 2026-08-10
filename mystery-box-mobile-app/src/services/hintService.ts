import { api, buildAuthHeaders } from "../api";

export type HintResult = {
  excludedQualityType?: string | null;
  excludedQualityTypes: string[];
  hintCardsRemaining: number;
  hintsRemaining: number;
};

export async function requestBoxHint(token: string, boxId: string): Promise<HintResult> {
  const response = await api.post<{ result: HintResult }>(`/front/mystery-box/${boxId}/hint`, {}, {
    headers: buildAuthHeaders(token),
  });
  return response.data.result;
}

export async function fetchHintSession(
  token: string,
  boxId: string,
): Promise<Pick<HintResult, "excludedQualityTypes">> {
  try {
    const response = await api.get<{ result?: Pick<HintResult, "excludedQualityTypes"> } & Pick<
      HintResult,
      "excludedQualityTypes"
    >>(`/front/mystery-box/${boxId}/hint/session`, {
      headers: buildAuthHeaders(token),
    });
    const data = response.data.result ?? response.data;
    return { excludedQualityTypes: data.excludedQualityTypes ?? [] };
  } catch {
    return { excludedQualityTypes: [] };
  }
}

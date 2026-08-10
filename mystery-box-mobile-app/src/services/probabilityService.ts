import { api } from "../api";

export type BoxProbability = {
  legendaryRate: number;
  hiddenRate: number;
  generalRate: number;
  updatedAt: string;
};

export type ProbabilityHistoryItem = {
  legendaryRate: number;
  hiddenRate: number;
  generalRate: number;
  effectiveTime: string;
  operatorId?: string | null;
};

export async function fetchBoxProbability(boxId: string): Promise<BoxProbability | null> {
  try {
    const response = await api.get<{ result: BoxProbability }>(`/front/mystery-box/${boxId}/probability`);
    return response.data.result;
  } catch {
    return null;
  }
}

export async function fetchProbabilityHistory(boxId: string, limit = 10): Promise<ProbabilityHistoryItem[]> {
  try {
    const response = await api.get<{ result: ProbabilityHistoryItem[] }>(
      `/front/mystery-box/${boxId}/probability/history`,
      { params: { limit } },
    );
    return response.data.result ?? [];
  } catch {
    return [];
  }
}

export function rateToPercent(rate: number) {
  return `${(rate / 100).toFixed(2)}%`;
}

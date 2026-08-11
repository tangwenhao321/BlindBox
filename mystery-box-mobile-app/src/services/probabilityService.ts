import { api, buildAuthHeaders } from "../api";

export type BoxProbability = {
  legendaryRate: number;
  hiddenRate: number;
  generalRate: number;
  updatedAt: string;
  dynamicProbability?: boolean;
  effectiveLegendaryRate?: number | null;
  effectiveHiddenRate?: number | null;
  effectiveGeneralRate?: number | null;
};

export type ProbabilityHistoryItem = {
  legendaryRate: number;
  hiddenRate: number;
  generalRate: number;
  effectiveTime: string;
  operatorId?: string | null;
};

function normalizeProbability(raw: Record<string, unknown> | null | undefined): BoxProbability | null {
  if (!raw || typeof raw !== "object") return null;
  const legendaryRate = Number(raw.legendaryRate);
  const hiddenRate = Number(raw.hiddenRate);
  const generalRate = Number(raw.generalRate);
  if (![legendaryRate, hiddenRate, generalRate].every(Number.isFinite)) return null;
  const effectiveLegendary = raw.effectiveLegendaryRate == null ? null : Number(raw.effectiveLegendaryRate);
  const effectiveHidden = raw.effectiveHiddenRate == null ? null : Number(raw.effectiveHiddenRate);
  const effectiveGeneral = raw.effectiveGeneralRate == null ? null : Number(raw.effectiveGeneralRate);
  return {
    legendaryRate,
    hiddenRate,
    generalRate,
    updatedAt: String(raw.updatedAt ?? ""),
    dynamicProbability: raw.dynamicProbability !== false,
    effectiveLegendaryRate: Number.isFinite(effectiveLegendary as number) ? (effectiveLegendary as number) : null,
    effectiveHiddenRate: Number.isFinite(effectiveHidden as number) ? (effectiveHidden as number) : null,
    effectiveGeneralRate: Number.isFinite(effectiveGeneral as number) ? (effectiveGeneral as number) : null,
  };
}

export async function fetchBoxProbability(
  boxId: string,
  options?: { token?: string | null; drawCount?: number },
): Promise<BoxProbability | null> {
  try {
    const headers = options?.token ? buildAuthHeaders(options.token) : undefined;
    const response = await api.get<{ result: BoxProbability } | BoxProbability>(
      `/front/mystery-box/${boxId}/probability`,
      {
        headers,
        params: options?.drawCount != null ? { drawCount: options.drawCount } : undefined,
      },
    );
    const data = response.data;
    const raw =
      data && typeof data === "object" && "result" in data && data.result
        ? (data.result as Record<string, unknown>)
        : (data as Record<string, unknown>);
    return normalizeProbability(raw);
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

/** Prefer effective (user-adjusted) rates when the API returns them. */
export function resolveDisplayRates(prob: BoxProbability | null | undefined): {
  legendaryRate: number;
  hiddenRate: number;
  generalRate: number;
  adjusted: boolean;
} | null {
  if (!prob) return null;
  const hasEffective =
    prob.effectiveLegendaryRate != null &&
    prob.effectiveHiddenRate != null &&
    prob.effectiveGeneralRate != null;
  if (hasEffective) {
    return {
      legendaryRate: prob.effectiveLegendaryRate as number,
      hiddenRate: prob.effectiveHiddenRate as number,
      generalRate: prob.effectiveGeneralRate as number,
      adjusted: true,
    };
  }
  return {
    legendaryRate: prob.legendaryRate,
    hiddenRate: prob.hiddenRate,
    generalRate: prob.generalRate,
    adjusted: false,
  };
}

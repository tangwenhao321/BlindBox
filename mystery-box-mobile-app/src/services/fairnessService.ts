import { api } from "../api";

export type SeriesDrawTierStat = {
  qualityType: string;
  count: number;
  actualPercent: number;
};

export type SeriesDrawStatistics = {
  mysteryBoxId: string;
  mysteryBoxName: string;
  totalDraws: number;
  configuredLegendaryRate: number;
  configuredHiddenRate: number;
  configuredGeneralRate: number;
  tiers: SeriesDrawTierStat[];
  asOf?: string;
};

export type FairnessVerifyResult = {
  drawLogId: string;
  orderId: string;
  productId: string;
  productName: string;
  qualityType: string;
  fairnessSeed: string;
  fairnessHash: string;
  createdTime: string;
  verified: boolean;
};

/** Published UTC-day beacon used to bind fairness commits (GET /front/fairness/daily-beacon). */
export type FairnessDailyBeacon = {
  dayUtc: string;
  beacon: string;
};

function unwrapDailyBeacon(data: unknown): FairnessDailyBeacon | null {
  if (!data || typeof data !== "object") return null;
  const root = data as { dayUtc?: unknown; beacon?: unknown; result?: unknown };
  if (typeof root.dayUtc === "string" && typeof root.beacon === "string" && root.beacon) {
    return { dayUtc: root.dayUtc, beacon: root.beacon };
  }
  return unwrapDailyBeacon(root.result);
}

export async function fetchDailyBeacon(): Promise<FairnessDailyBeacon | null> {
  const response = await api.get<FairnessDailyBeacon | { result?: FairnessDailyBeacon }>(
    "/front/fairness/daily-beacon",
  );
  return unwrapDailyBeacon(response.data);
}

export async function verifyFairnessByOrder(orderId: string): Promise<FairnessVerifyResult[]> {
  const response = await api.get<FairnessVerifyResult[] | { result?: FairnessVerifyResult[] }>(
    `/front/fairness/order/${orderId}`,
  );
  const data = response.data;
  if (Array.isArray(data)) return data;
  return data.result ?? [];
}

export async function fetchSeriesDrawStatistics(mysteryBoxId: string): Promise<SeriesDrawStatistics> {
  const response = await api.get<SeriesDrawStatistics | { result?: SeriesDrawStatistics }>(
    `/front/fairness/series/${mysteryBoxId}/draw-statistics`,
  );
  const data = response.data;
  if (data && typeof data === "object" && "mysteryBoxId" in data) {
    return data as SeriesDrawStatistics;
  }
  return (data as { result?: SeriesDrawStatistics }).result ?? {
    mysteryBoxId,
    mysteryBoxName: "",
    totalDraws: 0,
    configuredLegendaryRate: 0,
    configuredHiddenRate: 0,
    configuredGeneralRate: 0,
    tiers: [],
  };
}

import { api, buildAuthHeaders } from "../api";

export type PrizeStockLine = {
  relId: string;
  productId: string;
  productName: string;
  qualityType: string;
  stockTotal: number;
  stockRemaining: number;
  lastOne: boolean;
  soldOut: boolean;
  sortOrder: number;
};

export type MysteryBoxInsight = {
  poolTotal: number;
  poolRemaining: number;
  designatedBenefitRemaining?: number | null;
  designatedBenefitHint?: string | null;
  prizeLines: PrizeStockLine[];
};

export async function fetchBoxInsight(token: string | undefined, boxId: string): Promise<MysteryBoxInsight | null> {
  try {
    const response = await api.get<{ result: MysteryBoxInsight }>(`/front/mystery-box/${boxId}/insight`, {
      headers: token ? buildAuthHeaders(token) : undefined,
    });
    const insight = response.data.result;
    return {
      ...insight,
      prizeLines: insight.prizeLines ?? [],
    };
  } catch {
    return null;
  }
}

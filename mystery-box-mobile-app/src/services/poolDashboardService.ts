import { api, buildAuthHeaders } from "../api";

export type PoolTierSummary = {
  qualityType: string;
  total: number;
  remaining: number;
};

export type PoolDashboard = {
  poolTotal: number;
  poolRemaining: number;
  tiers: PoolTierSummary[];
  lastOne: { productId: string; productName: string; available: boolean } | null;
  updatedAt?: string;
};

export async function fetchPoolDashboard(
  token: string | undefined,
  boxId: string,
): Promise<PoolDashboard | null> {
  try {
    const response = await api.get<{ result: PoolDashboard }>(`/front/mystery-box/${boxId}/pool-dashboard`, {
      headers: token ? buildAuthHeaders(token) : undefined,
    });
    return response.data.result;
  } catch {
    return null;
  }
}

import { api, buildAuthHeaders } from "../api";

export type PurchaseLimitStatus = {
  maxPerDay: number;
  usedToday: number;
  remainingToday: number;
};

export async function fetchPurchaseLimit(
  authToken: string,
  boxId: string,
): Promise<PurchaseLimitStatus> {
  const response = await api.get<PurchaseLimitStatus | { result?: PurchaseLimitStatus }>(
    `/front/mystery-box-order/purchase-limit/${boxId}`,
    { headers: buildAuthHeaders(authToken) },
  );
  const data = response.data;
  if ("remainingToday" in data) return data;
  return data.result ?? { maxPerDay: 0, usedToday: 0, remainingToday: 999 };
}

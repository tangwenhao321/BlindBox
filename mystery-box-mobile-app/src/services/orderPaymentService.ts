import { api, buildAuthHeaders } from "../api";

export type OrderPaymentMeta = {
  orderId: string;
  payDeadline: string;
  stockLockedSeconds?: number | null;
  retentionClaimed: boolean;
  retentionDiscountAmount: number;
};

export type AbandonOfferResult = {
  granted: boolean;
  discountAmount: number;
  message: string;
};

export async function fetchOrderPaymentMeta(token: string, orderId: string): Promise<OrderPaymentMeta | null> {
  try {
    const response = await api.get<{ result: OrderPaymentMeta }>(
      `/front/mystery-box-order/${orderId}/payment-meta`,
      { headers: buildAuthHeaders(token) },
    );
    return response.data.result;
  } catch {
    return null;
  }
}

export async function claimAbandonOffer(token: string, orderId: string): Promise<AbandonOfferResult> {
  const response = await api.post<{ result: AbandonOfferResult }>(
    `/front/mystery-box-order/${orderId}/abandon-offer`,
    {},
    { headers: buildAuthHeaders(token) },
  );
  return response.data.result;
}

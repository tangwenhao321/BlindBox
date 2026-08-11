import { api, buildAuthHeaders } from "../api";

export type OrderPaymentMeta = {
  orderId: string;
  payDeadline: string;
  stockLockedSeconds?: number | null;
  retentionClaimed: boolean;
  retentionDiscountAmount: number;
  retentionEligible?: boolean;
  retentionBlockReason?: string | null;
  payAmount?: number | null;
};

export type AbandonOfferResult = {
  granted: boolean;
  discountAmount: number;
  message: string;
  /** Pay amount on the original order after claim apply (when granted). */
  payAmount?: number | null;
};

export async function fetchOrderPaymentMeta(token: string, orderId: string): Promise<OrderPaymentMeta | null> {
  try {
    const response = await api.get<{ result: OrderPaymentMeta }>(
      `/front/mystery-box-order/${orderId}/payment-meta`,
      { headers: buildAuthHeaders(token) },
    );
    const result = response.data.result;
    if (!result) return null;
    // Backend record uses retentionDiscount; tolerate either key.
    const raw = result as OrderPaymentMeta & { retentionDiscount?: number };
    return {
      ...result,
      retentionDiscountAmount: Number(raw.retentionDiscountAmount ?? raw.retentionDiscount ?? 0),
      retentionEligible: raw.retentionEligible ?? !raw.retentionClaimed,
      payAmount: raw.payAmount == null ? null : Number(raw.payAmount),
    };
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

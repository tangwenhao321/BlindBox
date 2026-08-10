import { api, buildAuthHeaders } from "../api";

export type RefundRecord = {
  id: string;
  orderId: string;
  reason: string;
  amount: number;
  status?: { keyEnName?: string; keyName?: string };
  createdTime?: string;
};

export async function applyRefund(
  authToken: string,
  payload: { orderId: string; reason: string; amount: number },
): Promise<string> {
  const response = await api.post<string | { result?: string }>(
    "/front/refund-record/save",
    {
      orderId: payload.orderId,
      reason: payload.reason,
      amount: payload.amount,
    },
    { headers: buildAuthHeaders(authToken) },
  );
  const data = response.data;
  if (typeof data === "string") return data;
  return data.result ?? "";
}

export async function fetchRefundTimeline(authToken: string, refundId: string) {
  const response = await api.get<
    { step: string; label: string; at?: string; detail?: string | null }[]
  >(`/front/refund-record/${refundId}/timeline`, { headers: buildAuthHeaders(authToken) });
  return response.data ?? [];
}

export async function queryMyRefunds(authToken: string): Promise<RefundRecord[]> {
  const response = await api.post<{ content?: RefundRecord[] }>(
    "/front/refund-record/query",
    { pageNum: 1, pageSize: 20, query: {} },
    { headers: buildAuthHeaders(authToken) },
  );
  return response.data.content ?? [];
}

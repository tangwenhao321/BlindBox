import { api, buildAuthHeaders } from "../api";

export type ShipLinePayload = {
  orderId: string;
  orderItemId?: string;
  productId: string;
};

export type ShipQuote = {
  itemCount: number;
  orderRemindCount: number;
  marketplaceCount: number;
  productAmount: number;
  deliveryFee: number;
  payAmount: number;
  feeHint: string;
  addressText?: string;
};

export async function quoteWarehouseShip(
  authToken: string,
  addressId: string,
  items: ShipLinePayload[],
): Promise<ShipQuote> {
  const response = await api.post<ShipQuote | { result?: ShipQuote }>(
    "/front/warehouse/ship/quote",
    { addressId, items },
    { headers: buildAuthHeaders(authToken) },
  );
  const data = response.data;
  if ("itemCount" in data) return data;
  return data.result ?? (data as ShipQuote);
}

export async function submitWarehouseShip(
  authToken: string,
  addressId: string,
  items: ShipLinePayload[],
): Promise<string> {
  const response = await api.post<string | { result?: string }>(
    "/front/warehouse/ship/submit",
    { addressId, items },
    { headers: buildAuthHeaders(authToken) },
  );
  const data = response.data;
  if (typeof data === "string") return data;
  return data.result ?? "";
}

export type ShipRequestSummary = {
  id: string;
  status: string;
  itemCount: number;
  payAmount: number;
  trackingNumber?: string | null;
  carrierCode?: string | null;
  addressSnapshot?: string | null;
  rejectReason?: string | null;
  createdTime?: string;
};

export async function fetchMyWarehouseShipRequests(
  authToken: string,
  limit = 10,
): Promise<ShipRequestSummary[]> {
  const response = await api.get<ShipRequestSummary[] | { result?: ShipRequestSummary[] }>(
    "/front/warehouse/ship/requests",
    { params: { limit }, headers: buildAuthHeaders(authToken) },
  );
  const data = response.data;
  if (Array.isArray(data)) return data;
  return data.result ?? [];
}

export async function cancelWarehouseShipRequest(authToken: string, requestId: string): Promise<void> {
  await api.post(
    `/front/warehouse/ship/requests/${requestId}/cancel`,
    {},
    { headers: buildAuthHeaders(authToken) },
  );
}

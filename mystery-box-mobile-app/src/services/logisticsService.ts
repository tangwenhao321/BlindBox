import { api, buildAuthHeaders } from "../api";

export type TrackingEvent = {
  status: string;
  description: string;
  eventTime?: string;
  source?: string;
};

export type TrackingResult = {
  refId?: string | null;
  trackingNumber?: string | null;
  carrierCode?: string | null;
  events: TrackingEvent[];
  latestStatus: string;
  liveProvider: boolean;
};

export type LogisticsEvent = TrackingEvent;

export async function fetchOrderLogistics(authToken: string, orderId: string): Promise<LogisticsEvent[]> {
  const result = await fetchOrderTracking(authToken, orderId);
  return result.events ?? [];
}

export async function fetchOrderTracking(authToken: string, orderId: string): Promise<TrackingResult> {
  const response = await api.get<TrackingResult | { result?: TrackingResult }>(
    `/front/logistics/order/${orderId}`,
    { headers: buildAuthHeaders(authToken) },
  );
  const data = response.data;
  if ("events" in data) return data;
  return data.result ?? { events: [], latestStatus: "UNKNOWN", liveProvider: false };
}

export async function fetchWarehouseShipTracking(
  authToken: string,
  requestId: string,
): Promise<TrackingResult> {
  const response = await api.get<TrackingResult | { result?: TrackingResult }>(
    `/front/logistics/warehouse-ship/${requestId}`,
    { headers: buildAuthHeaders(authToken) },
  );
  const data = response.data;
  if ("events" in data) return data;
  return data.result ?? { events: [], latestStatus: "UNKNOWN", liveProvider: false };
}

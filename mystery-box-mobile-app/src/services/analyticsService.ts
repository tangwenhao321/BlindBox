import { api, buildAuthHeaders } from "../api";
import type { ApiResult } from "../types";
import type { EventItem } from "../utils/analytics";

export async function uploadAnalyticsEvents(token: string, events: EventItem[]) {
  if (!events.length) {
    return 0;
  }
  const response = await api.post<ApiResult<number>>("/front/analytics/events", events, {
    headers: buildAuthHeaders(token),
  });
  return response.data.result || 0;
}

export async function uploadGuestAnalyticsEvents(events: EventItem[]) {
  if (!events.length) {
    return 0;
  }
  const response = await api.post<ApiResult<number>>("/front/analytics/events/guest", events);
  return response.data.result || 0;
}

import { api, buildAuthHeaders } from "../api";

export type NotificationPrefs = {
  orderEnabled: boolean;
  refundEnabled: boolean;
  warehouseShipEnabled: boolean;
  marketplaceEnabled: boolean;
  marketingEnabled: boolean;
};

export async function fetchNotificationPrefs(token: string): Promise<NotificationPrefs> {
  const response = await api.get<{ result: NotificationPrefs }>("/front/user/notification-prefs", {
    headers: buildAuthHeaders(token),
  });
  return response.data.result;
}

export async function updateNotificationPrefs(token: string, prefs: NotificationPrefs): Promise<NotificationPrefs> {
  const response = await api.put<{ result: NotificationPrefs }>("/front/user/notification-prefs", prefs, {
    headers: buildAuthHeaders(token),
  });
  return response.data.result;
}

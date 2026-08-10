import { api, buildAuthHeaders } from "../api";

export type UserNotification = {
  id: string;
  category: string;
  title: string;
  body: string;
  refId: string | null;
  read: boolean;
  createdTime: string;
};

export async function fetchNotifications(token: string, limit = 20): Promise<UserNotification[]> {
  try {
    const response = await api.get<{ result: UserNotification[] }>("/front/notifications", {
      params: { limit },
      headers: buildAuthHeaders(token),
    });
    return response.data.result ?? [];
  } catch {
    return [];
  }
}

export async function fetchUnreadNotificationCount(token: string): Promise<number> {
  try {
    const response = await api.get<{ result: { count: number } }>("/front/notifications/unread-count", {
      headers: buildAuthHeaders(token),
    });
    return response.data.result?.count ?? 0;
  } catch {
    return 0;
  }
}

export async function markNotificationsRead(token: string, ids: string[]): Promise<void> {
  if (!ids.length) return;
  await api.post("/front/notifications/mark-read", ids, { headers: buildAuthHeaders(token) });
}

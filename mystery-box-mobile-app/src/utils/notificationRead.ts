import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "read_notification_ids";

export async function loadReadNotificationIds() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return new Set<string>();
    return new Set<string>(JSON.parse(raw) as string[]);
  } catch {
    return new Set<string>();
  }
}

export async function saveReadNotificationIds(ids: Set<string>) {
  await AsyncStorage.setItem(KEY, JSON.stringify([...ids]));
}

export async function markNotificationsRead(notificationIds: string[]) {
  const current = await loadReadNotificationIds();
  notificationIds.forEach((id) => current.add(id));
  await saveReadNotificationIds(current);
  return current;
}

import { isRunningInExpoGo } from "expo";

type ExpoNotificationsModule = typeof import("expo-notifications");

let handlerConfigured = false;

/** Remote push and token APIs are unavailable in Expo Go (SDK 53+). */
export function canUseExpoNotifications(): boolean {
  return !isRunningInExpoGo();
}

export async function loadExpoNotifications(): Promise<ExpoNotificationsModule | null> {
  if (!canUseExpoNotifications()) return null;
  try {
    const Notifications = await import("expo-notifications");
    if (!handlerConfigured) {
      handlerConfigured = true;
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    }
    return Notifications;
  } catch {
    return null;
  }
}

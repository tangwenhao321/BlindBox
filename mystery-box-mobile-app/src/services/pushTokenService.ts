import { Platform } from "react-native";

import { PUSH_TOKEN_INTEREST_CATEGORIES } from "../config/notificationCategories";

import { api, buildAuthHeaders, parseError } from "../api";

import { trackEvent } from "../utils/analytics";

import { loadExpoNotifications } from "../utils/expoNotificationsGate";

export async function registerExpoPushToken(authToken: string): Promise<void> {
  const Notifications = await loadExpoNotifications();
  if (!Notifications) return;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      finalStatus = req.status;
      if (finalStatus === "granted") {
        trackEvent("notification_permission_granted");
      } else {
        trackEvent("notification_permission_denied", { status: finalStatus });
        return;
      }
    } else {
      trackEvent("notification_permission_granted", { alreadyGranted: true });
    }

    const tokenResult = await Notifications.getExpoPushTokenAsync();
    const expoPushToken = tokenResult.data;
    if (!expoPushToken) {
      trackEvent("push_token_register_fail", { reason: "empty_token" });
      return;
    }

    await api.post(
      "/front/user/push-token",
      {
        expoPushToken,
        platform: Platform.OS,
        categories: PUSH_TOKEN_INTEREST_CATEGORIES,
      },
      { headers: buildAuthHeaders(authToken) },
    );
    trackEvent("push_token_registered", { platform: Platform.OS });
  } catch (error) {
    trackEvent("push_token_register_fail", { message: parseError(error) });
  }
}

export async function unregisterExpoPushToken(authToken: string): Promise<void> {
  if (!authToken) return;
  try {
    await api.delete("/front/user/push-token", { headers: buildAuthHeaders(authToken) });
    trackEvent("push_token_unregistered");
    const Notifications = await loadExpoNotifications();
    if (Notifications) {
      await Notifications.setBadgeCountAsync(0);
    }
  } catch (error) {
    trackEvent("push_token_unregister_fail", { message: parseError(error) });
  }
}

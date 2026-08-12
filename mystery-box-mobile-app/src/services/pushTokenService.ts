import { Platform } from "react-native";
import Constants from "expo-constants";

import { PUSH_TOKEN_INTEREST_CATEGORIES } from "../config/notificationCategories";
import { api, buildAuthHeaders, parseError } from "../api";
import { trackEvent } from "../utils/analytics";
import { getAppReleaseChannel } from "../utils/appVersion";
import { loadExpoNotifications } from "../utils/expoNotificationsGate";

/** Matches app.config.js PLACEHOLDER_EAS_PROJECT_ID — never register push with this id. */
const PLACEHOLDER_EAS_PROJECT_ID = "00000000-0000-4000-8000-000000000001";

function resolveExpoProjectId(): string | undefined {
  return (
    Constants.easConfig?.projectId ||
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ||
    undefined
  );
}

function isUsableProjectId(projectId: string | undefined): projectId is string {
  return !!projectId && projectId !== PLACEHOLDER_EAS_PROJECT_ID;
}

async function readLocalExpoPushToken(): Promise<string | null> {
  const Notifications = await loadExpoNotifications();
  if (!Notifications) return null;
  try {
    const projectId = resolveExpoProjectId();
    if (!isUsableProjectId(projectId)) return null;
    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
    return tokenResult?.data?.trim() || null;
  } catch {
    return null;
  }
}

export type RegisterPushOptions = {
  /** When false (default), only register if permission already granted — do not prompt on login. */
  requestPermission?: boolean;
};

export async function registerExpoPushToken(
  authToken: string,
  opts?: RegisterPushOptions,
): Promise<void> {
  const Notifications = await loadExpoNotifications();
  if (!Notifications) return;
  const requestPermission = opts?.requestPermission === true;

  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      if (!requestPermission) {
        trackEvent("push_token_register_deferred", { status: existing });
        return;
      }
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

    const projectId = resolveExpoProjectId();
    if (!isUsableProjectId(projectId)) {
      trackEvent("push_token_register_fail", {
        reason: projectId ? "placeholder_project_id" : "missing_project_id",
      });
      return;
    }

    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
    const expoPushToken = tokenResult.data;
    if (!expoPushToken) {
      trackEvent("push_token_register_fail", { reason: "empty_token" });
      return;
    }

    const releaseChannel = getAppReleaseChannel();
    await api.post(
      "/front/user/push-token",
      {
        expoPushToken,
        platform: Platform.OS,
        releaseChannel,
        categories: PUSH_TOKEN_INTEREST_CATEGORIES,
      },
      { headers: buildAuthHeaders(authToken) },
    );
    trackEvent("push_token_registered", { platform: Platform.OS, releaseChannel });
  } catch (error) {
    trackEvent("push_token_register_fail", { message: parseError(error) });
  }
}

/**
 * Unregisters only this device's token so a logout on phone does not silence a still-signed-in tablet.
 */
export async function unregisterExpoPushToken(authToken: string): Promise<void> {
  if (!authToken) return;
  try {
    const expoPushToken = await readLocalExpoPushToken();
    if (expoPushToken) {
      await api.delete("/front/user/push-token", {
        headers: buildAuthHeaders(authToken),
        params: { expoPushToken },
      });
    }
    trackEvent("push_token_unregistered");
    const Notifications = await loadExpoNotifications();
    if (Notifications) {
      await Notifications.setBadgeCountAsync(0);
    }
  } catch (error) {
    trackEvent("push_token_unregister_fail", { message: parseError(error) });
  }
}

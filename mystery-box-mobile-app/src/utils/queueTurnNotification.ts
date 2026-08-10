import i18n from "../i18n";
import { fetchNotificationPrefs } from "../services/notificationPrefsService";
import { loadExpoNotifications } from "./expoNotificationsGate";

let lastNotifiedAt = 0;
const COOLDOWN_MS = 30_000;

type QueueNotifyContext = {
  authToken?: string;
};

/** Fire a local notification when queue position reaches the user (foreground or background). */
export async function notifyQueueYourTurn(ctx?: QueueNotifyContext): Promise<void> {
  const now = Date.now();
  if (now - lastNotifiedAt < COOLDOWN_MS) return;

  if (ctx?.authToken) {
    try {
      const prefs = await fetchNotificationPrefs(ctx.authToken);
      if (!prefs.orderEnabled) return;
    } catch {
      // fall through — still try local notification
    }
  }

  lastNotifiedAt = now;

  const Notifications = await loadExpoNotifications();
  if (!Notifications) return;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      if (req.status !== "granted") return;
    }
    await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t("drawQueue.yourTurnToast"),
        body: i18n.t("drawQueue.yourTurn"),
        data: { type: "queue_turn" },
      },
      trigger: null,
    });
  } catch {
    // notifications unavailable
  }
}

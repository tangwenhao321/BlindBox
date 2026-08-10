import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "../i18n";
import { loadExpoNotifications } from "./expoNotificationsGate";
import {
  buildPayDeadlineReminderSeconds,
  fallbackPayReminderSeconds,
} from "./pendingPaymentReminderSchedule";

const STORAGE_KEY = "pending_payment_notification_ids";

async function readStoredIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [raw];
  } catch {
    return [];
  }
}

async function writeStoredIds(ids: string[]) {
  if (!ids.length) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export async function schedulePendingPaymentNotification(
  orderId: string,
  boxName: string,
  payDeadlineIso?: string,
) {
  const Notifications = await loadExpoNotifications();
  if (!Notifications) return;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      if (req.status !== "granted") return;
    }
    await cancelPendingPaymentNotification();

    const triggers = payDeadlineIso
      ? buildPayDeadlineReminderSeconds(payDeadlineIso)
      : [fallbackPayReminderSeconds()];

    const ids: string[] = [];
    for (const seconds of triggers) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: i18n.t("payment.pendingPayTitle"),
          body:
            seconds <= 90
              ? i18n.t("payment.pendingPayBodySoon", { boxName })
              : i18n.t("payment.pendingPayBodyNormal", { boxName }),
          data: { orderId },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
        },
      });
      ids.push(id);
    }
    await writeStoredIds(ids);
  } catch {
    // ignore when notifications are unavailable
  }
}

export async function cancelPendingPaymentNotification() {
  const Notifications = await loadExpoNotifications();
  if (!Notifications) return;

  try {
    const existing = await readStoredIds();
    await Promise.all(existing.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

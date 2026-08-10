import { useEffect } from "react";
import {
  extractPushData,
  resolveNotificationDeepLink,
} from "../utils/notificationDeepLink";
import { loadExpoNotifications } from "../utils/expoNotificationsGate";
import { NOTIFICATION_CATEGORIES } from "../config/notificationCategories";
import { requestAppUpdateCheck } from "../services/appUpdateSignal";
import type { AppView } from "../components/mainTabs/appViews";
import { followNotificationDeepLink } from "./followNotificationDeepLink";

type Options = {
  isLoggedIn: boolean;
  navigate: (view: AppView) => void;
  openOrderDetails: (orderId: string) => void | Promise<void>;
  openBoxDetails?: (boxId: string) => void | Promise<void>;
};

function handleAppUpdatePush(refId?: string | null): boolean {
  const versionCode = Number(refId ?? 0);
  requestAppUpdateCheck(Number.isFinite(versionCode) ? versionCode : 0);
  return true;
}

export function useNotificationDeepLink({ isLoggedIn, navigate, openOrderDetails, openBoxDetails }: Options) {
  useEffect(() => {
    let responseSub: { remove: () => void } | undefined;
    let receivedSub: { remove: () => void } | undefined;
    void (async () => {
      const Notifications = await loadExpoNotifications();
      if (!Notifications) return;

      try {
        const handleResponse = (data: unknown) => {
          const payload = extractPushData(data);
          if (payload.category === NOTIFICATION_CATEGORIES.APP_UPDATE) {
            handleAppUpdatePush(payload.refId);
            return;
          }
          const link = resolveNotificationDeepLink(payload.category, payload.refId);
          if (link) {
            followNotificationDeepLink(link, isLoggedIn, navigate, openOrderDetails, openBoxDetails);
          }
        };

        const last = await Notifications.getLastNotificationResponseAsync();
        handleResponse(last?.notification.request.content.data);

        responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
          handleResponse(response.notification.request.content.data);
        });

        // Update notices must act while the app is already open, without waiting for a tap.
        receivedSub = Notifications.addNotificationReceivedListener((notification) => {
          const payload = extractPushData(notification.request.content.data);
          if (payload.category === NOTIFICATION_CATEGORIES.APP_UPDATE) {
            handleAppUpdatePush(payload.refId);
          }
        });
      } catch {
        // notifications unavailable
      }
    })();
    return () => {
      responseSub?.remove();
      receivedSub?.remove();
    };
  }, [isLoggedIn, navigate, openOrderDetails, openBoxDetails]);
}

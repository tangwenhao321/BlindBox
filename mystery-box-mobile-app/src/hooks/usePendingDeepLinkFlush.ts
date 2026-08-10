import { useEffect } from "react";
import { consumePendingNotificationDeepLink } from "../utils/deepLinkParams";
import type { AppView } from "../components/mainTabs/appViews";
import { followNotificationDeepLink } from "./followNotificationDeepLink";
import { trackEvent } from "../utils/analytics";

type Options = {
  isLoggedIn: boolean;
  navigate: (view: AppView) => void;
  openOrderDetails: (orderId: string) => void | Promise<void>;
  openBoxDetails?: (boxId: string) => void | Promise<void>;
};

/** After login, navigate to push / URL target that arrived while logged out. */
export function usePendingDeepLinkFlush({ isLoggedIn, navigate, openOrderDetails, openBoxDetails }: Options) {
  useEffect(() => {
    if (!isLoggedIn) return;
    const pending = consumePendingNotificationDeepLink();
    if (pending) {
      trackEvent("deep_link_resume", {
        view: pending.view,
        orderId: pending.orderId,
        boxId: pending.boxId,
        shipRequestId: pending.shipRequestId,
      });
      followNotificationDeepLink(pending, true, navigate, openOrderDetails, openBoxDetails);
    }
  }, [isLoggedIn, navigate, openOrderDetails, openBoxDetails]);
}

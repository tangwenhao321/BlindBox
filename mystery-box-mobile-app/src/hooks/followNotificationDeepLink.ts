import type { AppView } from "../components/mainTabs/appViews";
import { isAppViewAccessible } from "../config/featureAccess";
import i18n from "../i18n";
import type { NotificationDeepLink } from "../utils/notificationDeepLink";
import { pushAppDeepLink } from "../navigation/pushAppDeepLink";
import { trackEvent } from "../utils/analytics";
import { setPendingNotificationDeepLink, setPendingShipRequestId } from "../utils/deepLinkParams";
import { toast } from "../utils/toast";

export function followNotificationDeepLink(
  link: NotificationDeepLink,
  isLoggedIn: boolean,
  navigate: (view: AppView) => void,
  openOrderDetails: (orderId: string) => void | Promise<void>,
  openBoxDetails?: (boxId: string) => void | Promise<void>,
) {
  trackEvent("deep_link_open", {
    view: link.view,
    orderId: link.orderId,
    boxId: link.boxId,
    shipRequestId: link.shipRequestId,
    deferred: !isLoggedIn,
  });
  if (!isLoggedIn) {
    setPendingNotificationDeepLink(link);
    if (link.view === "shipRequests" && link.shipRequestId) {
      setPendingShipRequestId(link.shipRequestId);
    }
    return;
  }
  if (link.view === "shipRequests" && link.shipRequestId) {
    setPendingShipRequestId(link.shipRequestId);
  }
  if (!isAppViewAccessible(link.view)) {
    toast.info(i18n.t("featureDisabled"));
    navigate("home");
    return;
  }
  if (pushAppDeepLink(link)) {
    return;
  }
  if (link.view === "orderDetails" && link.orderId) {
    void openOrderDetails(link.orderId);
    return;
  }
  if (link.view === "boxDetails" && link.boxId && openBoxDetails) {
    void openBoxDetails(link.boxId);
    return;
  }
  navigate(link.view);
}

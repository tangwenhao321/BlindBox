import type { NotificationDeepLink } from "./notificationDeepLink";

/** Ephemeral params for push / URL navigation (consumed on target screen mount). */

let pendingShipRequestId: string | null = null;
let pendingNotificationLink: NotificationDeepLink | null = null;

export function setPendingShipRequestId(id: string | null) {
  pendingShipRequestId = id?.trim() || null;
}

export function consumePendingShipRequestId(): string | null {
  const id = pendingShipRequestId;
  pendingShipRequestId = null;
  return id;
}

export function setPendingNotificationDeepLink(link: NotificationDeepLink | null) {
  pendingNotificationLink = link;
}

export function consumePendingNotificationDeepLink(): NotificationDeepLink | null {
  const link = pendingNotificationLink;
  pendingNotificationLink = null;
  return link;
}

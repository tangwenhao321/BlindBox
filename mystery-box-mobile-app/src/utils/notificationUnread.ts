import type { UserNotification } from "../services/notificationService";
import type { Order } from "../types";
import { ORDER_STATUS } from "../config/constants";

/** Order ids already represented in local tab badges (unpaid / to receive). */
export function orderIdsForLocalUnread(orders: Order[]): Set<string> {
  return new Set(
    orders
      .filter(
        (o) =>
          o.status === ORDER_STATUS.TO_BE_PAID || o.status === ORDER_STATUS.TO_BE_RECEIVED,
      )
      .map((o) => o.id),
  );
}

/**
 * Count server notifications not already covered by order-based local unread.
 * PAYMENT_REMINDER with refId matching an unpaid order is deduped.
 */
export function countDedupedServerUnread(
  notifications: UserNotification[],
  orderUnreadIds: Set<string>,
): number {
  return notifications.filter((n) => {
    if (n.read) return false;
    if (n.refId && orderUnreadIds.has(n.refId)) {
      const cat = (n.category ?? "").toUpperCase();
      if (
        cat.includes("PAY") ||
        cat.includes("ORDER") ||
        cat.includes("PENDING") ||
        cat.includes("REFUND")
      ) {
        return false;
      }
    }
    return true;
  }).length;
}

export function mergeUnreadBadge(
  localUnread: number,
  notifications: UserNotification[],
  orderUnreadIds: Set<string>,
): number {
  return localUnread + countDedupedServerUnread(notifications, orderUnreadIds);
}

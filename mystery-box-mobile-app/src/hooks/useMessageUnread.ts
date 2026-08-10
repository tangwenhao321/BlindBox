import { useCallback, useEffect, useMemo, useState } from "react";
import { ORDER_STATUS } from "../config/constants";
import { fetchNotifications, type UserNotification } from "../services/notificationService";
import { mergeUnreadBadge, orderIdsForLocalUnread } from "../utils/notificationUnread";
import type { Order } from "../types";

type Params = {
  token: string;
  orders: Order[];
  couponCount: number;
  readNotificationIds: Set<string>;
};

export function useMessageUnread({ token, orders, couponCount, readNotificationIds }: Params) {
  const [serverNotifications, setServerNotifications] = useState<UserNotification[]>([]);

  const refreshServerNotifications = useCallback(async () => {
    if (!token) {
      setServerNotifications([]);
      return;
    }
    const list = await fetchNotifications(token, 50);
    setServerNotifications(list);
  }, [token]);

  useEffect(() => {
    void refreshServerNotifications();
    if (!token) return;
    const timer = setInterval(() => void refreshServerNotifications(), 60_000);
    return () => clearInterval(timer);
  }, [token, refreshServerNotifications]);

  const orderUnreadIds = useMemo(() => orderIdsForLocalUnread(orders), [orders]);

  const localUnreadCount = useMemo(
    () =>
      orders.filter(
        (o) =>
          (o.status === ORDER_STATUS.TO_BE_PAID || o.status === ORDER_STATUS.TO_BE_RECEIVED) &&
          !readNotificationIds.has(o.id),
      ).length + (couponCount > 0 ? 1 : 0),
    [orders, couponCount, readNotificationIds],
  );

  const unreadMessageCount = useMemo(
    () => mergeUnreadBadge(localUnreadCount, serverNotifications, orderUnreadIds),
    [localUnreadCount, serverNotifications, orderUnreadIds],
  );

  return {
    serverNotifications,
    unreadMessageCount,
    refreshServerNotifications,
  };
}

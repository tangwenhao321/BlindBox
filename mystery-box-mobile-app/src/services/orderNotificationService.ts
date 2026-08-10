import { ORDER_STATUS } from "../config/constants";
import i18n from "../i18n";
import { getOrderBoxName, getOrderStatusLabel } from "../order-utils";
import type { Order } from "../types";

export type OrderNotificationEvent = {
  id: string;
  orderId: string;
  type: "pay" | "ship" | "receive" | "shipped";
  title: string;
  body: string;
  createdAt: string;
};

export function buildOrderNotificationEvents(orders: Order[]): OrderNotificationEvent[] {
  const events: OrderNotificationEvent[] = [];
  for (const order of orders) {
    const boxName = getOrderBoxName(order);
    const time = order.createdTime || "";
    if (order.status === ORDER_STATUS.TO_BE_PAID) {
      events.push({
        id: `${order.id}-pay`,
        orderId: order.id,
        type: "pay",
        title: i18n.t("messages.orderPayTitle"),
        body: i18n.t("messages.orderPayBody", { boxName }),
        createdAt: time,
      });
    }
    if (order.status === ORDER_STATUS.TO_BE_DELIVERED) {
      events.push({
        id: `${order.id}-ship`,
        orderId: order.id,
        type: "ship",
        title: i18n.t("messages.orderShipTitle"),
        body: i18n.t("messages.orderShipBody", { boxName }),
        createdAt: time,
      });
    }
    if (order.status === ORDER_STATUS.TO_BE_RECEIVED) {
      events.push({
        id: `${order.id}-recv`,
        orderId: order.id,
        type: "receive",
        title: i18n.t("messages.orderReceiveTitle"),
        body: i18n.t("messages.orderReceiveBody", { boxName }),
        createdAt: time,
      });
    }
    if (order.baseOrder?.trackingNumber) {
      events.push({
        id: `${order.id}-track`,
        orderId: order.id,
        type: "shipped",
        title: i18n.t("messages.orderTrackTitle"),
        body: i18n.t("messages.orderTrackBody", {
          tracking: order.baseOrder.trackingNumber,
          status: getOrderStatusLabel(order.status),
        }),
        createdAt: time,
      });
    }
  }
  return events.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

import { useEffect } from "react";
import { ORDER_STATUS } from "../config/constants";
import i18n from "../i18n";
import { formatOrderIdShort } from "../order-utils";
import type { Order } from "../types";
import {
  clearPendingPaymentReminder,
  loadPendingPaymentReminderOrderId,
  rememberPendingPaymentOrder,
} from "../utils/pendingPaymentReminder";
import {
  cancelPendingPaymentNotification,
  schedulePendingPaymentNotification,
} from "../utils/pendingPaymentNotification";
import { fetchOrderPaymentMeta } from "../services/orderPaymentService";
import { toast } from "../utils/toast";

type OrderCreatedPayload = {
  orderId: string;
  boxName: string;
  drawCount: number;
  payAmount: number;
};

export function usePendingPayment(token: string | undefined, orders: Order[]) {
  useEffect(() => {
    if (!token) return;
    void loadPendingPaymentReminderOrderId().then((orderId) => {
      if (!orderId) return;
      const pending = orders.find((o) => o.id === orderId && o.status === ORDER_STATUS.TO_BE_PAID);
      if (pending) {
        toast.info(i18n.t("orderActions.pendingPayment", { orderId: formatOrderIdShort(orderId) }));
      }
    });
  }, [token, orders]);

  const onOrderCreated = async (payload: OrderCreatedPayload) => {
    await rememberPendingPaymentOrder(payload.orderId);
    const meta = token ? await fetchOrderPaymentMeta(token, payload.orderId) : null;
    await schedulePendingPaymentNotification(payload.orderId, payload.boxName, meta?.payDeadline);
  };

  const onPaymentSuccess = async () => {
    await clearPendingPaymentReminder();
    await cancelPendingPaymentNotification();
  };

  const onCancelUnpaid = async () => {
    await clearPendingPaymentReminder();
    await cancelPendingPaymentNotification();
  };

  return { onOrderCreated, onPaymentSuccess, onCancelUnpaid };
}

import { ORDER_STATUS } from "../config/constants";
import type { WarehouseApiItem } from "../services/warehouseService";
import type { Order } from "../types";

export function computeOrderBadges(orders: Order[], warehouseItems: WarehouseApiItem[] = []) {
  const shipPendingCount = warehouseItems.filter((item) => item.pendingShipRequest).length;
  return {
    pendingPay: orders.filter((item) => item.status === ORDER_STATUS.TO_BE_PAID).length,
    pendingDelivery:
      warehouseItems.length > 0
        ? shipPendingCount
        : orders.filter((item) => item.status === ORDER_STATUS.TO_BE_DELIVERED).length,
    pendingReceive: orders.filter((item) => item.status === ORDER_STATUS.TO_BE_RECEIVED).length,
    completed: orders.filter(
      (item) => item.status === ORDER_STATUS.FINISHED || item.status === ORDER_STATUS.COMPLETED,
    ).length,
  };
}

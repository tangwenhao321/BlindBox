import { ORDER_STATUS } from "./constants";

/** Order list tab ids with i18n label keys (single source for MyOrdersView). */
export const ORDER_TAB_KEYS = [
  { id: "ALL", labelKey: "orders.tabAll" },
  { id: ORDER_STATUS.TO_BE_DELIVERED, labelKey: "orders.tabToShip" },
  { id: ORDER_STATUS.TO_BE_RECEIVED, labelKey: "orders.tabToReceive" },
  { id: ORDER_STATUS.FINISHED, labelKey: "orders.tabFinished" },
  { id: ORDER_STATUS.TO_BE_PAID, labelKey: "orders.tabUnpaid" },
] as const;

export const ORDER_FILTER_IDS = [
  "ALL",
  ORDER_STATUS.TO_BE_PAID,
  ORDER_STATUS.TO_BE_DELIVERED,
  ORDER_STATUS.CLOSED,
  ORDER_STATUS.TO_BE_RECEIVED,
  ORDER_STATUS.FINISHED,
  ORDER_STATUS.REFUNDED,
] as const;

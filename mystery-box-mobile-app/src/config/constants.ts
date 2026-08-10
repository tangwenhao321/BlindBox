export const DEFAULT_QUERY_PAGE_NUM = 1;
export const DEFAULT_QUERY_PAGE_SIZE = 20;
export const BOX_LIST_PAGE_SIZE = 40;
export const ORDER_LIST_PAGE_SIZE = 20;
export const ORDER_REFRESH_INTERVAL_MS = 15000;
export const ORDER_REFRESH_DEBOUNCE_MS = 1200;

export const ORDER_STATUS = {
  TO_BE_PAID: "TO_BE_PAID",
  TO_BE_DELIVERED: "TO_BE_DELIVERED",
  TO_BE_RECEIVED: "TO_BE_RECEIVED",
  /** 后端状态为 FINISHED */
  FINISHED: "FINISHED",
  COMPLETED: "COMPLETED",
  CLOSED: "CLOSED",
  REFUNDED: "REFUNDED",
} as const;

/** 生产构建默认关闭；开发默认开启，可用 EXPO_PUBLIC_MOCK_PAYMENT=false 覆盖 */
export const MOCK_PAYMENT_ENABLED = (() => {
  const raw = process.env.EXPO_PUBLIC_MOCK_PAYMENT;
  if (raw != null && raw.trim() !== "") {
    return raw.toLowerCase() !== "false";
  }
  return __DEV__;
})();

/** 客服热线，可通过 EXPO_PUBLIC_SUPPORT_PHONE 覆盖 */
export const SUPPORT_HOTLINE = process.env.EXPO_PUBLIC_SUPPORT_PHONE ?? "";

/** 企业微信号，可通过 EXPO_PUBLIC_ENTERPRISE_WECHAT_ID 覆盖 */
export const ENTERPRISE_WECHAT_ID = process.env.EXPO_PUBLIC_ENTERPRISE_WECHAT_ID ?? "";

/** Zalo Official Account ID，可通过 EXPO_PUBLIC_ZALO_OA_ID 覆盖 */
export const ZALO_OA_ID = process.env.EXPO_PUBLIC_ZALO_OA_ID ?? "";

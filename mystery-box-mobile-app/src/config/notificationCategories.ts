/** Push / in-app notification categories aligned with backend payloads. */
export const NOTIFICATION_CATEGORIES = {
  ORDER: "ORDER",
  PENDING_PAY: "PENDING_PAY",
  WAREHOUSE_SHIP: "WAREHOUSE_SHIP",
  REFUND: "REFUND",
  MARKETPLACE: "MARKETPLACE",
  COUPON: "COUPON",
  COMMUNITY: "COMMUNITY",
  WELFARE: "WELFARE",
  MESSAGES: "MESSAGES",
  RESTOCK: "RESTOCK",
  PITY: "PITY",
  PROBABILITY_CHANGE: "PROBABILITY_CHANGE",
  APP_UPDATE: "APP_UPDATE",
} as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[keyof typeof NOTIFICATION_CATEGORIES];

/** Categories surfaced in message center filters beyond built-in order tabs. */
export const MESSAGE_CENTER_EXTRA_FILTERS: { key: NotificationCategory; labelKey: string }[] = [
  { key: NOTIFICATION_CATEGORIES.RESTOCK, labelKey: "messages.filterRestock" },
  { key: NOTIFICATION_CATEGORIES.PITY, labelKey: "messages.filterPity" },
  { key: NOTIFICATION_CATEGORIES.PROBABILITY_CHANGE, labelKey: "messages.filterProbability" },
  { key: NOTIFICATION_CATEGORIES.MARKETPLACE, labelKey: "messages.filterMarketplace" },
];

/** Optional interest tags sent with push token registration (forward-compatible). */
export const PUSH_TOKEN_INTEREST_CATEGORIES: NotificationCategory[] = [
  NOTIFICATION_CATEGORIES.RESTOCK,
  NOTIFICATION_CATEGORIES.PITY,
  NOTIFICATION_CATEGORIES.PROBABILITY_CHANGE,
  NOTIFICATION_CATEGORIES.MARKETPLACE,
];

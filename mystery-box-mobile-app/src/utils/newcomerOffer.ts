import AsyncStorage from "@react-native-async-storage/async-storage";
import { ORDER_STATUS } from "../config/constants";
import type { MysteryBox, Order } from "../types";
import { getAppCurrency } from "./formatCurrency";

const SESSION_DISMISSED_KEY = "newcomer_offer_session_dismissed_v1";
const PURCHASED_BOX_KEY = "user_has_purchased_box_v1";

/** CNY-scale demo price when exclusive box is missing. */
export const NEWCOMER_FALLBACK_PRICE_CNY = 0.01;
/** VND-scale demo price when exclusive box is missing (~token amount). */
export const NEWCOMER_FALLBACK_PRICE_VND = 1000;

/** @deprecated Prefer {@link getNewcomerFallbackPrice} — kept for tests that assert CNY default. */
export const NEWCOMER_FALLBACK_PRICE = NEWCOMER_FALLBACK_PRICE_CNY;

export function getNewcomerFallbackPrice(locale?: string): number {
  return getAppCurrency(locale) === "VND" ? NEWCOMER_FALLBACK_PRICE_VND : NEWCOMER_FALLBACK_PRICE_CNY;
}

const OPENED_STATUSES = new Set<string>([
  ORDER_STATUS.TO_BE_DELIVERED,
  ORDER_STATUS.TO_BE_RECEIVED,
  ORDER_STATUS.FINISHED,
  ORDER_STATUS.COMPLETED,
  ORDER_STATUS.CLOSED,
]);

const NON_NEWCOMER_STATUSES = new Set([
  "CANCELLED",
  "CANCELED",
  "REFUNDED",
  "TO_BE_PAID",
]);

/** 是否已成功开盒（已支付且进入发货/完成流程，或已有奖品） */
export function hasOpenedBlindBox(orders: Order[]): boolean {
  return orders.some((order) => {
    if (OPENED_STATUSES.has(order.status)) return true;
    const hasPrizes = order.items?.some((item) => (item.products?.length ?? 0) > 0);
    if (hasPrizes) return true;
    if (order.baseOrder?.payment?.payTime) return true;
    const status = (order.status || "").toUpperCase();
    if (status && !NON_NEWCOMER_STATUSES.has(status)) return true;
    return false;
  });
}

export async function isNewcomerSessionDismissed(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_DISMISSED_KEY);
    return raw === "1";
  } catch {
    return false;
  }
}

export async function dismissNewcomerForSession(): Promise<void> {
  await AsyncStorage.setItem(SESSION_DISMISSED_KEY, "1");
}

export async function clearNewcomerSessionDismissed(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_DISMISSED_KEY);
}

export async function markUserHasPurchased(): Promise<void> {
  await AsyncStorage.setItem(PURCHASED_BOX_KEY, "1");
}

export async function hasUserPurchasedLocally(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(PURCHASED_BOX_KEY)) === "1";
  } catch {
    return false;
  }
}

export function shouldShowNewcomerOffer(orders: Order[], sessionDismissed: boolean): boolean {
  if (sessionDismissed) return false;
  return !hasOpenedBlindBox(orders);
}

export async function shouldShowNewcomerOfferAsync(orders: Order[], sessionDismissed: boolean): Promise<boolean> {
  if (sessionDismissed) return false;
  if (hasOpenedBlindBox(orders)) return false;
  if (await hasUserPurchasedLocally()) return false;
  return true;
}

export function findNewcomerExclusiveBox(boxes: MysteryBox[]): MysteryBox | undefined {
  return boxes.find((box) => box.newcomerExclusive);
}

export function getNewcomerBarPrice(boxes: MysteryBox[]): number {
  return findNewcomerExclusiveBox(boxes)?.price ?? getNewcomerFallbackPrice();
}

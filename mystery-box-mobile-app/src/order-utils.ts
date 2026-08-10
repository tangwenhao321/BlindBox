import { ORDER_STATUS } from "./config/constants";
import i18n from "./i18n";
import { getAppLocale } from "./utils/i18nLocale";
import { resolveBoxImageUrl } from "./utils/boxImage";
import type { ThemeColors } from "./styles/themes";
import { getThemeColors } from "./styles/themes";
import type { CouponItem, Order } from "./types";

export const getOrderStatusLabel = (status?: string) => {
  if (!status) return i18n.t("order.status.unknown");
  const key = `order.status.${status}`;
  if (i18n.exists(key)) return i18n.t(key);
  return status;
};

export function isUnpaidOrder(order: Order) {
  return order.status === ORDER_STATUS.TO_BE_PAID;
}

export const getOrderStatusTheme = (status?: string, colors: ThemeColors = getThemeColors("light")) => {
  switch (status) {
    case ORDER_STATUS.TO_BE_PAID:
      return { bg: colors.orderUnpaidBg, text: colors.orderUnpaidText, border: colors.orderUnpaidBorder };
    case ORDER_STATUS.TO_BE_DELIVERED:
      return { bg: colors.orderDeliverBg, text: colors.orderDeliverText, border: colors.orderDeliverBorder };
    case ORDER_STATUS.TO_BE_RECEIVED:
      return { bg: colors.orderReceiveBg, text: colors.orderReceiveText, border: colors.orderReceiveBorder };
    case ORDER_STATUS.FINISHED:
    case ORDER_STATUS.COMPLETED:
      return { bg: colors.orderFinishedBg, text: colors.orderFinishedText, border: colors.orderFinishedBorder };
    default:
      return { bg: colors.orderDefaultBg, text: colors.orderDefaultText, border: colors.orderDefaultBorder };
  }
};

export function maskPhone(phone?: string) {
  if (!phone || phone.length < 7) return phone || i18n.t("orderUtils.phoneUnbound");
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

export function getOrderBoxName(order: Order) {
  const item = order.items?.[0];
  const snapshotName = item?.mysteryBox?.name;
  if (snapshotName) return snapshotName;
  if (item?.mysteryBoxId) return i18n.t("orderUtils.boxOrderFallback", { id: formatOrderIdShort(item.mysteryBoxId, 8) });
  return i18n.t("orderUtils.boxOrderDefault");
}

export function getOrderBoxCover(order: Order) {
  const item = order.items?.[0];
  const box = item?.mysteryBox;
  if (!box?.cover && !box?.id && !box?.name) return undefined;
  return resolveBoxImageUrl({
    id: box?.id || item?.mysteryBoxId || "order-box",
    name: box?.name || getOrderBoxName(order),
    cover: box?.cover,
  });
}

export function formatOrderTime(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const locale = getAppLocale();
  return date.toLocaleString(locale, { hour12: false });
}

export function getOrderTimeLabel(order: Order) {
  return formatOrderTime(order.createdTime || order.baseOrder?.payment?.payTime) || i18n.t("orderUtils.timeUnknown");
}

export function getCouponDisplayName(coupon: CouponItem) {
  const name = coupon.name || coupon.coupon?.name || i18n.t("orderUtils.couponFallback");
  const amount = coupon.amount ?? coupon.coupon?.amount;
  return amount != null ? i18n.t("orderUtils.couponWithAmount", { name, amount }) : name;
}

/** 展示用订单号：仅保留数字字符 */
export function formatOrderIdDisplay(id: string): string {
  const digits = id.replace(/\D/g, "");
  if (digits.length >= 6) return digits;
  let mapped = "";
  for (const ch of id) {
    if (ch >= "0" && ch <= "9") mapped += ch;
    else if (ch >= "a" && ch <= "f") mapped += String(parseInt(ch, 16) % 10);
    else if (ch >= "A" && ch <= "F") mapped += String(parseInt(ch, 16) % 10);
  }
  return mapped || digits || id;
}

/** 紧凑展示：新单显示完整数字，过长时保留末段 */
export function formatOrderIdShort(id: string, maxLen = 12): string {
  const full = formatOrderIdDisplay(id);
  if (full.length <= maxLen) return full;
  return full.slice(-maxLen);
}


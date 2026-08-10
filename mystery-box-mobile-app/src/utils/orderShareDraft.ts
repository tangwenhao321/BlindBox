import type { TFunction } from "i18next";
import type { Order } from "../types";
import { getOrderBoxName, formatOrderIdShort } from "../order-utils";

/** Build community post draft text from a completed order. */
export function buildOrderCommunityDraft(t: TFunction, order: Order, topPrizeName?: string): string {
  const boxName = getOrderBoxName(order);
  const count = order.items?.[0]?.mysteryBoxCount ?? 1;
  const prize = topPrizeName ? t("sharePoster.communityDraftPrize", { name: topPrizeName }) : "";
  return t("sharePoster.communityDraft", { boxName, count, prize });
}

export function buildOrderShareMessage(
  t: TFunction,
  order: Order,
  topPrizeName?: string,
  extra = "",
) {
  const boxName = getOrderBoxName(order);
  const drawCount = order.items?.[0]?.mysteryBoxCount ?? 1;
  return t("sharePoster.message", {
    boxName,
    count: drawCount,
    prize: topPrizeName ? t("sharePoster.messagePrize", { name: topPrizeName }) : "",
    orderId: formatOrderIdShort(order.id),
    extra,
    spectator: "",
  });
}

import type { OrderResultState } from "./buildAppModalsProps";
import { getOrderBoxCover, getOrderBoxName } from "../order-utils";
import { sumOrderDrawCount } from "../effects/normalize";
import type { MysteryBox, Order, Product } from "../types";

export function applyPaymentSuccessToOrderResult(
  prev: OrderResultState,
  orderId: string,
  prizes: Product[],
  drawCount?: number,
  order?: Order,
): OrderResultState {
  if (!prev || prev.orderId !== orderId) {
    if (!order) return prev;
    const resolvedDrawCount =
      drawCount && drawCount > 0 ? drawCount : sumOrderDrawCount(order) || prev?.drawCount || 1;
    return {
      orderId,
      boxName: prev?.boxName ?? getOrderBoxName(order),
      boxId: prev?.boxId ?? order.items?.[0]?.mysteryBoxId ?? order.items?.[0]?.mysteryBox?.id,
      boxCategoryName: prev?.boxCategoryName,
      boxCover: prev?.boxCover ?? getOrderBoxCover(order),
      drawCount: resolvedDrawCount,
      payAmount: prev?.payAmount ?? Number(order.baseOrder?.payment?.payAmount ?? 0),
      prizes,
      pendingPayment: false,
      revealPlaybackKey: (prev?.revealPlaybackKey ?? 0) + 1,
    };
  }
  const resolvedDrawCount = drawCount && drawCount > 0 ? drawCount : prev.drawCount;
  const boxCover = prev.boxCover ?? (order ? getOrderBoxCover(order) : undefined);
  return {
    ...prev,
    pendingPayment: false,
    prizes,
    drawCount: resolvedDrawCount,
    boxCover,
    revealPlaybackKey: (prev.revealPlaybackKey ?? 0) + 1,
  };
}

/** Resolve box context for “buy again” when checkout state lost activeBox. */
export function resolveBoxForOrderRetry(
  activeBox: MysteryBox | null,
  orderResult: NonNullable<OrderResultState>,
): MysteryBox | null {
  if (activeBox?.id === orderResult.boxId) return activeBox;
  if (!orderResult.boxId) return activeBox;
  const unitPrice =
    activeBox?.price && activeBox.price > 0
      ? activeBox.price
      : orderResult.drawCount > 0 && orderResult.payAmount > 0
        ? orderResult.payAmount / orderResult.drawCount
        : 0;
  return {
    id: orderResult.boxId,
    name: orderResult.boxName,
    cover: orderResult.boxCover,
    price: unitPrice,
    products: activeBox?.products ?? [],
    category: activeBox?.category,
  };
}

export function orderResultFromCreated(payload: {
  orderId: string;
  boxName: string;
  boxId?: string;
  boxCategoryName?: string;
  boxCover?: string;
  drawCount: number;
  payAmount: number;
}): NonNullable<OrderResultState> {
  return {
    orderId: payload.orderId,
    boxName: payload.boxName,
    boxId: payload.boxId,
    boxCategoryName: payload.boxCategoryName,
    boxCover: payload.boxCover,
    drawCount: payload.drawCount,
    payAmount: payload.payAmount,
    prizes: [],
    pendingPayment: true,
    revealPlaybackKey: 0,
  };
}

import type { OfflineMutationKind } from "../offline/offlineMutationTypes";

/** i18n keys for persisted offline mutation kinds. */
export const OFFLINE_KIND_ACTION_KEYS: Record<OfflineMutationKind, string> = {
  saveAddress: "offline.actionSaveAddress",
  createOrder: "offline.actionOrder",
  cancelOrder: "offline.actionCancelOrder",
  confirmReceive: "offline.actionConfirmReceive",
  redeem: "offline.actionRedeem",
  mockPayment: "offline.actionPay",
  communityPost: "offline.actionPost",
  communityComment: "offline.actionComment",
  communityLike: "offline.actionLike",
  marketplaceBuy: "offline.actionBuy",
  marketplaceCancel: "offline.actionDelist",
  warehouseShipSubmit: "offline.actionShip",
  warehouseShipCancel: "offline.actionCancelShip",
  toggleFavorite: "offline.actionUnfavorite",
  submitFeedback: "offline.actionFeedback",
  marketplaceList: "offline.actionListMarket",
  applyRefund: "offline.actionRefund",
  exchangeFragment: "offline.actionExchange",
  decomposeOrderItem: "offline.actionDecompose",
};

export function offlineKindToActionKey(kind: OfflineMutationKind): string {
  return OFFLINE_KIND_ACTION_KEYS[kind];
}

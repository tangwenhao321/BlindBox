export type OfflineMutationKind =
  | "saveAddress"
  | "createOrder"
  | "cancelOrder"
  | "confirmReceive"
  | "redeem"
  | "mockPayment"
  | "communityPost"
  | "communityComment"
  | "communityLike"
  | "marketplaceBuy"
  | "marketplaceCancel"
  | "warehouseShipSubmit"
  | "warehouseShipCancel"
  | "toggleFavorite"
  | "submitFeedback"
  | "marketplaceList"
  | "applyRefund"
  | "exchangeFragment"
  | "decomposeOrderItem";

export type PersistedOfflineMutation = {
  id: string;
  label: string;
  kind: OfflineMutationKind;
  /** @deprecated Legacy disk entries only; never written for new mutations. */
  token?: string;
  payload: Record<string, unknown>;
  createdAt: number;
};

export type OfflinePersistInput = {
  kind: OfflineMutationKind;
  token: string;
  payload: Record<string, unknown>;
};

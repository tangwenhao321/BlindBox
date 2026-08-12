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
  /** Fingerprint of the session that enqueued; flush skips mismatches. */
  ownerKey?: string;
  payload: Record<string, unknown>;
  createdAt: number;
};

export type OfflinePersistInput = {
  kind: OfflineMutationKind;
  token: string;
  payload: Record<string, unknown>;
};

export function offlineOwnerKeyFromToken(token: string): string {
  const raw = token.trim();
  if (!raw) return "";
  // Stable non-reversible-enough binding for device-local queue scoping (not a password hash).
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `u${(h >>> 0).toString(16)}`;
}

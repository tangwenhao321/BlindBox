export type MarketplaceChatParams = {
  listingId: string;
  listingTitle?: string;
};

let pending: MarketplaceChatParams | null = null;

export function setMarketplaceChatParams(params: MarketplaceChatParams) {
  pending = params;
}

export function peekMarketplaceChatParams(): MarketplaceChatParams | null {
  return pending;
}

export function clearMarketplaceChatParams() {
  pending = null;
}

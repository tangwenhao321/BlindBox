import { api, buildAuthHeaders } from "../api";
import { createIdempotencyKey, IDEMPOTENCY_HEADER } from "../utils/idempotencyKey";

export type MarketplaceListing = {
  id: string;
  sellerUserId: string;
  orderId: string;
  orderItemId: string;
  productId: string;
  productName: string;
  cover: string | null;
  qualityType: string | null;
  price: number;
  status: string;
  createdTime: string;
  coolingUntil?: string | null;
  tradeId?: string | null;
  sellerCredit?: number | null;
  /** Present when listing is linked to a trade (e.g. PENDING_EXTERNAL payout). */
  tradeStatus?: string | null;
};

export async function fetchMyMarketplaceListings(
  authToken: string,
  limit = 30,
): Promise<MarketplaceListing[]> {
  const response = await api.get<MarketplaceListing[] | { result?: MarketplaceListing[] }>(
    "/front/marketplace/my-listings",
    { params: { limit }, headers: buildAuthHeaders(authToken) },
  );
  const data = response.data;
  if (Array.isArray(data)) return data;
  return data.result ?? [];
}

export async function fetchMarketplaceListings(
  limit = 20,
  keyword?: string,
  sort: "newest" | "price_asc" | "price_desc" = "newest",
  minPrice?: number,
  maxPrice?: number,
  offset = 0,
): Promise<MarketplaceListing[]> {
  const response = await api.get<MarketplaceListing[] | { result?: MarketplaceListing[] }>(
    "/front/marketplace/listings",
    { params: { limit, offset, keyword: keyword?.trim() || undefined, sort, minPrice, maxPrice } },
  );
  const data = response.data;
  if (Array.isArray(data)) return data;
  return data.result ?? [];
}

export type PurchasedListing = {
  id: string;
  productName: string;
  cover: string | null;
  qualityType: string | null;
  price: number;
  buyerShipStatus: string | null;
  soldTime: string | null;
  status?: string | null;
  coolingUntil?: string | null;
  tradeId?: string | null;
  sellerCredit?: number | null;
  tradeStatus?: string | null;
};

export async function fetchPurchasedMarketplaceListings(
  authToken: string,
  limit = 30,
): Promise<PurchasedListing[]> {
  const response = await api.get<PurchasedListing[] | { result?: PurchasedListing[] }>(
    "/front/marketplace/purchased",
    { params: { limit }, headers: buildAuthHeaders(authToken) },
  );
  const data = response.data;
  if (Array.isArray(data)) return data;
  return data.result ?? [];
}

export async function createMarketplaceListing(
  authToken: string,
  payload: { orderId: string; orderItemId: string; productId: string; price: number },
): Promise<string> {
  const response = await api.post<string | { result?: string }>(
    "/front/marketplace/listings",
    payload,
    { headers: buildAuthHeaders(authToken) },
  );
  const data = response.data;
  if (typeof data === "string") return data;
  return data.result ?? "";
}

export async function cancelMarketplaceListing(authToken: string, listingId: string): Promise<void> {
  await api.post(
    `/front/marketplace/listings/${listingId}/cancel`,
    {},
    { headers: buildAuthHeaders(authToken) },
  );
}

export async function buyMarketplaceListing(authToken: string, listingId: string): Promise<string> {
  const response = await api.post<string | { result?: string }>(
    `/front/marketplace/listings/${listingId}/buy`,
    {},
    {
      headers: {
        ...buildAuthHeaders(authToken),
        [IDEMPOTENCY_HEADER]: createIdempotencyKey("marketplace-buy", listingId),
      },
    },
  );
  const data = response.data;
  if (typeof data === "string") return data;
  return data.result ?? "";
}

export async function cancelMarketplaceTrade(authToken: string, listingId: string): Promise<void> {
  await api.post(
    `/front/marketplace/listings/${listingId}/cancel-trade`,
    {},
    { headers: buildAuthHeaders(authToken) },
  );
}

export async function fetchMarketplaceCredit(
  authToken: string,
): Promise<{ userId: string; score: number }> {
  const response = await api.get<{ userId: string; score: number } | { result?: { userId: string; score: number } }>(
    "/front/marketplace/credit",
    { headers: buildAuthHeaders(authToken) },
  );
  const data = response.data;
  if (data && "score" in data) return data as { userId: string; score: number };
  return (data as { result?: { userId: string; score: number } }).result ?? { userId: "", score: 5 };
}

export async function rateMarketplaceTrade(
  authToken: string,
  tradeId: string,
  score: number,
): Promise<void> {
  await api.post(
    `/front/marketplace/trades/${tradeId}/rate`,
    { score },
    { headers: buildAuthHeaders(authToken) },
  );
}

export type MarketplaceCertificate = {
  id: string;
  listingId: string;
  productUniqueId: string | null;
  ipLicenseText: string | null;
  tradeHistoryJson: string | null;
  videoUrl: string | null;
  reviewStatus: string;
  createdTime: string;
};

export async function fetchMarketplaceCertificate(
  authToken: string | null,
  listingId: string,
): Promise<MarketplaceCertificate> {
  const response = await api.get<MarketplaceCertificate | { result?: MarketplaceCertificate }>(
    `/front/marketplace/listings/${listingId}/certificate`,
    { headers: authToken ? buildAuthHeaders(authToken) : undefined },
  );
  const data = response.data;
  if (data && "id" in data) return data as MarketplaceCertificate;
  return (data as { result?: MarketplaceCertificate }).result!;
}

export async function submitMarketplaceCertificate(
  authToken: string,
  listingId: string,
  payload: { videoUrl: string; productUniqueId?: string; ipLicenseText?: string },
): Promise<string> {
  const response = await api.post<string | { result?: string }>(
    `/front/marketplace/listings/${listingId}/certificate`,
    payload,
    { headers: buildAuthHeaders(authToken) },
  );
  const data = response.data;
  if (typeof data === "string") return data;
  return data.result ?? "";
}

export type MarketplaceChatMessage = {
  id: string;
  userId: string;
  /** Display name when API joins user profile. */
  nickname?: string | null;
  name?: string | null;
  msgType: string;
  body: string;
  createdTime: string;
};

export async function fetchMarketplaceListingChat(
  authToken: string,
  listingId: string,
  limit = 50,
): Promise<MarketplaceChatMessage[]> {
  const response = await api.get<MarketplaceChatMessage[] | { result?: MarketplaceChatMessage[] }>(
    `/front/marketplace/listings/${listingId}/chat`,
    { params: { limit }, headers: buildAuthHeaders(authToken) },
  );
  const data = response.data;
  if (Array.isArray(data)) return data;
  return data.result ?? [];
}

export async function postMarketplaceListingChat(
  authToken: string,
  listingId: string,
  body: string,
  msgType = "TEXT",
): Promise<void> {
  await api.post(
    `/front/marketplace/listings/${listingId}/chat`,
    { msgType, body },
    { headers: buildAuthHeaders(authToken) },
  );
}

/** Remaining cooling ms; 0 if expired/missing. */
export function coolingRemainingMs(coolingUntil?: string | null, now = Date.now()): number {
  if (!coolingUntil) return 0;
  const end = new Date(coolingUntil).getTime();
  if (Number.isNaN(end)) return 0;
  return Math.max(0, end - now);
}

export function formatCoolingCountdown(ms: number): string {
  if (ms <= 0) return "0:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

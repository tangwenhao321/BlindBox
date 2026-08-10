import { api, buildAuthHeaders } from "../api";

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

export async function buyMarketplaceListing(authToken: string, listingId: string): Promise<void> {
  await api.post(
    `/front/marketplace/listings/${listingId}/buy`,
    {},
    { headers: buildAuthHeaders(authToken) },
  );
}

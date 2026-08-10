import { api, buildAuthHeaders, parseError } from "../api";
import { BOX_LIST_PAGE_SIZE, ORDER_LIST_PAGE_SIZE } from "../config/constants";
import { getCurrentUserInfo } from "../services/authService";
import { queryAddresses } from "../services/addressService";
import { fetchBoxInsight, type MysteryBoxInsight } from "../services/boxInsightService";
import { queryBoxes, queryRecommendedBoxes } from "../services/boxService";
import { fetchCommunityPosts, type CommunityPostPage } from "../services/communityService";
import { queryUserCoupons } from "../services/couponService";
import { queryDrawPackConfigs, type DrawPackConfig } from "../services/drawPackService";
import { fetchSeriesDrawStatistics, type SeriesDrawStatistics } from "../services/fairnessService";
import {
  fetchMarketplaceListings,
  fetchMyMarketplaceListings,
  fetchPurchasedMarketplaceListings,
  type MarketplaceListing,
  type PurchasedListing,
} from "../services/marketplaceService";
import { fetchPityProgress, type PityProgress } from "../services/pityService";
import { fetchPoolDashboard, type PoolDashboard } from "../services/poolDashboardService";
import { fetchPurchaseLimit, type PurchaseLimitStatus } from "../services/purchaseLimitService";
import { fetchTrustMeta, type TrustMeta } from "../services/trustMetaService";
import { fetchWarehouseItems } from "../services/warehouseService";
import type { UserNotification } from "../services/notificationService";
import { queryOrders } from "../services/orderService";
import { listFavoriteBoxIds } from "../services/welfareService";
import type { Address, CouponItem, MysteryBox, Order } from "../types";
import { dedupeMysteryBoxes } from "../utils/boxDisplay";

export type BoxesPageResult = {
  items: MysteryBox[];
  hasMore: boolean;
};

export type MallBoxesQueryParams = {
  categoryId?: string;
  keyword?: string;
};

export type OrdersPageResult = {
  items: Order[];
  hasMore: boolean;
};

export async function fetchCouponsQuery(token: string): Promise<CouponItem[]> {
  const coupons = await queryUserCoupons(token);
  return coupons.filter((item) => (item.status || "").toUpperCase() !== "USED");
}

export function fetchWalletQuery(token: string) {
  return getCurrentUserInfo(token);
}

export function fetchWarehouseItemsQuery(
  token: string,
  pendingOnly = false,
  limit = 50,
  offset = 0,
) {
  return fetchWarehouseItems(token, pendingOnly, limit, offset);
}

export async function fetchCatalogSearchPage(
  token: string,
  keyword: string,
  pageNum: number,
): Promise<BoxesPageResult> {
  const { items, hasMore } = await queryBoxes(token, undefined, pageNum, { keyword });
  return { items: dedupeMysteryBoxes(items), hasMore };
}

export function fetchFavoriteIdsQuery(token: string): Promise<string[]> {
  return listFavoriteBoxIds(token);
}

export async function fetchNotificationsQuery(token: string, limit = 30): Promise<UserNotification[]> {
  try {
    const response = await api.get<{ result: UserNotification[] }>("/front/notifications", {
      params: { limit },
      headers: buildAuthHeaders(token),
    });
    return response.data.result ?? [];
  } catch (error) {
    throw new Error(parseError(error));
  }
}

export async function fetchHomeBoxesPage(token: string, pageNum: number): Promise<BoxesPageResult> {
  const { items, hasMore } = await queryBoxes(token, BOX_LIST_PAGE_SIZE, pageNum);
  if (pageNum !== 1) {
    return { items: dedupeMysteryBoxes(items), hasMore };
  }
  try {
    const recommended = await queryRecommendedBoxes(token, 8);
    if (!recommended.length) {
      return { items: dedupeMysteryBoxes(items), hasMore };
    }
    const recommendedIds = new Set(recommended.map((item) => item.id));
    return {
      items: dedupeMysteryBoxes([
        ...recommended,
        ...items.filter((item) => !recommendedIds.has(item.id)),
      ]),
      hasMore,
    };
  } catch {
    return { items: dedupeMysteryBoxes(items), hasMore };
  }
}

export async function fetchMallBoxesPage(
  token: string,
  pageNum: number,
  params: MallBoxesQueryParams = {},
): Promise<BoxesPageResult> {
  const keyword = params.keyword?.trim() || undefined;
  const { items, hasMore } = await queryBoxes(token, BOX_LIST_PAGE_SIZE, pageNum, {
    categoryId: params.categoryId,
    keyword,
  });
  return { items: dedupeMysteryBoxes(items), hasMore };
}

export async function fetchOrdersPage(token: string, pageNum: number): Promise<OrdersPageResult> {
  return queryOrders(token, ORDER_LIST_PAGE_SIZE, pageNum);
}

export function fetchAddressesQuery(token: string): Promise<Address[]> {
  return queryAddresses(token);
}

export function fetchCommunityPostsPage(
  token: string | undefined,
  pageNum: number,
  pageSize = 20,
): Promise<CommunityPostPage> {
  return fetchCommunityPosts(token, pageNum, pageSize);
}

export type MarketplaceListingsParams = {
  keyword: string;
  sort: "newest" | "price_asc" | "price_desc";
  minPrice: string;
  maxPrice: string;
  pageSize?: number;
  offset?: number;
};

export function fetchMarketplaceListingsPage(params: MarketplaceListingsParams): Promise<MarketplaceListing[]> {
  const { keyword, sort, minPrice, maxPrice, pageSize = 20, offset = 0 } = params;
  return fetchMarketplaceListings(
    pageSize,
    keyword,
    sort,
    minPrice.trim() ? Number(minPrice) : undefined,
    maxPrice.trim() ? Number(maxPrice) : undefined,
    offset,
  );
}

export function fetchMyMarketplaceListingsQuery(token: string, limit = 30): Promise<MarketplaceListing[]> {
  return fetchMyMarketplaceListings(token, limit);
}

export function fetchPurchasedMarketplaceListingsQuery(token: string, limit = 30): Promise<PurchasedListing[]> {
  return fetchPurchasedMarketplaceListings(token, limit);
}

export function fetchDrawPackConfigsQuery(token: string): Promise<DrawPackConfig[]> {
  return queryDrawPackConfigs(token);
}

export function fetchPurchaseLimitQuery(token: string, boxId: string): Promise<PurchaseLimitStatus> {
  return fetchPurchaseLimit(token, boxId);
}

export type BoxAuxiliaryData = {
  insight: MysteryBoxInsight | null;
  poolDashboard: PoolDashboard | null;
  trustMeta: TrustMeta | null;
  seriesDrawStats: SeriesDrawStatistics | null;
  pityProgress: PityProgress | null;
  pityError: string | null;
};

export async function fetchBoxAuxiliaryQuery(token: string, boxId: string): Promise<BoxAuxiliaryData> {
  const [ins, dash, meta, stats] = await Promise.all([
    fetchBoxInsight(token, boxId),
    fetchPoolDashboard(token, boxId),
    fetchTrustMeta(token, boxId),
    fetchSeriesDrawStatistics(boxId).catch(() => null),
  ]);
  let pityProgress: PityProgress | null = null;
  let pityError: string | null = null;
  if (token) {
    try {
      pityProgress = await fetchPityProgress(token, boxId);
    } catch (error) {
      pityError = parseError(error);
    }
  }
  return { insight: ins, poolDashboard: dash, trustMeta: meta, seriesDrawStats: stats, pityProgress, pityError };
}

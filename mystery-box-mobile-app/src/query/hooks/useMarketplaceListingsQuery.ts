import { useQuery } from "@tanstack/react-query";
import {
  fetchMarketplaceListingsPage,
  fetchMyMarketplaceListingsQuery,
  fetchPurchasedMarketplaceListingsQuery,
  type MarketplaceListingsParams,
} from "../fetchers";
import { queryKeys } from "../keys";

export type MarketSort = "newest" | "price_asc" | "price_desc";

export function useMarketplaceListingsQuery(
  keyword: string,
  sort: MarketSort,
  minPrice: string,
  maxPrice: string,
  offset = 0,
  enabled = true,
) {
  const params: MarketplaceListingsParams = { keyword, sort, minPrice, maxPrice, offset };
  return useQuery({
    queryKey: [...queryKeys.marketplace.listings(keyword, sort, minPrice, maxPrice), offset] as const,
    queryFn: () => fetchMarketplaceListingsPage(params),
    enabled,
    staleTime: 30_000,
    // Honor / captive-portal NetInfo can mark LAN as offline; never pause this public list.
    networkMode: "always",
    retry: 1,
  });
}

export function useMyMarketplaceListingsQuery(token: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.marketplace.mine(token ?? ""),
    queryFn: () => fetchMyMarketplaceListingsQuery(token!),
    enabled: !!token && enabled,
    staleTime: 30_000,
    networkMode: "always",
    retry: 1,
  });
}

export function usePurchasedMarketplaceListingsQuery(token: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.marketplace.purchased(token ?? ""),
    queryFn: () => fetchPurchasedMarketplaceListingsQuery(token!),
    enabled: !!token && enabled,
    staleTime: 30_000,
    networkMode: "always",
    retry: 1,
  });
}

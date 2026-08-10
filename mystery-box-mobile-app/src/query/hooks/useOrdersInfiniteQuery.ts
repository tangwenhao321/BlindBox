import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchOrdersPage } from "../fetchers";
import { ordersInfiniteQueryOptions } from "../infiniteQueryHelpers";
import { queryKeys } from "../keys";

export function useOrdersInfiniteQuery(token: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.orders.list(token),
    queryFn: ({ pageParam }) => fetchOrdersPage(token, pageParam),
    ...ordersInfiniteQueryOptions,
    enabled: enabled && !!token,
    staleTime: 15_000,
  });
}

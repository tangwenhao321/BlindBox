import type { BoxesPageResult, OrdersPageResult } from "./fetchers";

export const boxesInfiniteQueryOptions = {
  initialPageParam: 1,
  getNextPageParam: (lastPage: BoxesPageResult, _pages: BoxesPageResult[], lastPageParam: number) =>
    lastPage.hasMore ? lastPageParam + 1 : undefined,
} as const;

export const ordersInfiniteQueryOptions = {
  initialPageParam: 1,
  getNextPageParam: (lastPage: OrdersPageResult, _pages: OrdersPageResult[], lastPageParam: number) =>
    lastPage.hasMore ? lastPageParam + 1 : undefined,
} as const;

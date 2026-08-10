import { useCallback, useMemo, useRef, useState } from "react";
import type { InfiniteData } from "@tanstack/react-query";
import { parseError } from "../api";
import i18n from "../i18n";
import { ORDER_REFRESH_DEBOUNCE_MS } from "../config/constants";
import { readCatalogCache, writeCatalogCache } from "../utils/catalogCache";
import type { BoxesPageResult } from "../query/fetchers";
import {
  fetchAddressesQuery,
  fetchHomeBoxesPage,
  fetchMallBoxesPage,
  fetchOrdersPage,
} from "../query/fetchers";
import { flattenBoxPages, flattenOrderPages } from "../query/flattenInfinitePages";
import { useAddressesQuery } from "../query/hooks/useAddressesQuery";
import { useHomeBoxesInfiniteQuery } from "../query/hooks/useHomeBoxesInfiniteQuery";
import { useMallBoxesInfiniteQuery } from "../query/hooks/useMallBoxesInfiniteQuery";
import { useOrdersInfiniteQuery } from "../query/hooks/useOrdersInfiniteQuery";
import { boxesInfiniteQueryOptions, ordersInfiniteQueryOptions } from "../query/infiniteQueryHelpers";
import { queryKeys } from "../query/keys";
import { queryClient } from "../query/queryClient";
import type { MysteryBox } from "../types";

function primeHomeCache(token: string, items: MysteryBox[]) {
  queryClient.setQueryData<InfiniteData<BoxesPageResult>>(queryKeys.boxes.home(token), {
    pages: [{ items, hasMore: true }],
    pageParams: [1],
  });
}

export function useAppData(sessionToken = "") {
  const [mallCategoryId, setMallCategoryId] = useState<string | undefined>();
  const [mallKeyword, setMallKeyword] = useState<string | undefined>();
  const [boxesLoadError, setBoxesLoadError] = useState<string | null>(null);
  const [mallLoadError, setMallLoadError] = useState<string | null>(null);
  const [ordersLoadError, setOrdersLoadError] = useState<string | null>(null);
  const [addressesLoadError, setAddressesLoadError] = useState<string | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [lastOrderRefreshAt, setLastOrderRefreshAt] = useState(0);
  const mallLoadSeqRef = useRef(0);

  const homeQuery = useHomeBoxesInfiniteQuery(sessionToken);
  const mallQuery = useMallBoxesInfiniteQuery(sessionToken, { categoryId: mallCategoryId, keyword: mallKeyword });
  const ordersQuery = useOrdersInfiniteQuery(sessionToken);
  const addressesQuery = useAddressesQuery(sessionToken);

  const boxes = useMemo(() => flattenBoxPages(homeQuery.data), [homeQuery.data]);
  const mallBoxes = useMemo(() => flattenBoxPages(mallQuery.data), [mallQuery.data]);
  const orders = useMemo(() => flattenOrderPages(ordersQuery.data), [ordersQuery.data]);
  const addresses = addressesQuery.data ?? [];

  const hasMoreBoxes = useMemo(() => {
    const pages = homeQuery.data?.pages;
    if (!pages?.length) return true;
    return pages[pages.length - 1]?.hasMore ?? true;
  }, [homeQuery.data]);
  const hasMoreMallBoxes = useMemo(() => {
    const pages = mallQuery.data?.pages;
    if (!pages?.length) return true;
    return pages[pages.length - 1]?.hasMore ?? true;
  }, [mallQuery.data]);
  const hasMoreOrders = useMemo(() => {
    const pages = ordersQuery.data?.pages;
    if (!pages?.length) return true;
    return pages[pages.length - 1]?.hasMore ?? true;
  }, [ordersQuery.data]);
  const addressesLoading = addressesQuery.isFetching && !addressesQuery.data;
  const loadingMoreBoxes = homeQuery.isFetchingNextPage;
  const loadingMoreMallBoxes = mallQuery.isFetchingNextPage;
  const loadingMoreOrders = ordersQuery.isFetchingNextPage;
  const ordersReady = !sessionToken || (ordersQuery.isFetched && !ordersQuery.isFetching);

  const loadBoxes = useCallback(async (token: string) => {
    setBoxesLoadError(null);
    const cached = await readCatalogCache("home");
    if (cached?.length) {
      primeHomeCache(token, cached);
    }
    try {
      const result = await queryClient.fetchInfiniteQuery({
        queryKey: queryKeys.boxes.home(token),
        queryFn: ({ pageParam }) => fetchHomeBoxesPage(token, pageParam as number),
        ...boxesInfiniteQueryOptions,
        staleTime: 30_000,
      });
      const merged = flattenBoxPages(result);
      void writeCatalogCache("home", merged);
    } catch (error) {
      setBoxesLoadError(parseError(error));
      if (!cached?.length) {
        queryClient.setQueryData(queryKeys.boxes.home(token), undefined);
      }
      throw error;
    }
  }, []);

  const loadMoreBoxes = useCallback(
    async (_token: string) => {
      if (!hasMoreBoxes || loadingMoreBoxes) return;
      await homeQuery.fetchNextPage();
    },
    [hasMoreBoxes, homeQuery, loadingMoreBoxes],
  );

  const loadMallBoxes = useCallback(
    async (token: string, categoryId?: string, page = 1, keyword?: string) => {
      const seq = ++mallLoadSeqRef.current;
      const trimmedKeyword = keyword?.trim() || undefined;
      const mallKey = queryKeys.boxes.mall(token, categoryId, trimmedKeyword);

      if (page === 1) {
        setMallLoadError(null);
        const cached = await readCatalogCache("mall");
        if (cached?.length && !trimmedKeyword && !categoryId) {
          queryClient.setQueryData<InfiniteData<BoxesPageResult>>(mallKey, {
            pages: [{ items: cached, hasMore: true }],
            pageParams: [1],
          });
        }
      }

      try {
        if (page === 1) {
          const result = await queryClient.fetchInfiniteQuery({
            queryKey: mallKey,
            queryFn: ({ pageParam }) =>
              fetchMallBoxesPage(token, pageParam as number, { categoryId, keyword: trimmedKeyword }),
            ...boxesInfiniteQueryOptions,
            staleTime: 30_000,
          });
          if (seq !== mallLoadSeqRef.current) return;
          const items = flattenBoxPages(result);
          if (!trimmedKeyword && !categoryId) {
            void writeCatalogCache("mall", items);
          }
          setMallCategoryId(categoryId);
          setMallKeyword(trimmedKeyword);
          return;
        }

        const current = queryClient.getQueryData<InfiniteData<BoxesPageResult>>(mallKey);
        const { items, hasMore } = await fetchMallBoxesPage(token, page, { categoryId, keyword: trimmedKeyword });
        if (seq !== mallLoadSeqRef.current) return;

        const priorPages = current?.pages ?? [];
        const priorParams = current?.pageParams ?? [];
        queryClient.setQueryData<InfiniteData<BoxesPageResult>>(mallKey, {
          pages: [...priorPages, { items, hasMore }],
          pageParams: [...priorParams, page],
        });
        setMallCategoryId(categoryId);
        setMallKeyword(trimmedKeyword);
      } catch (error) {
        if (seq !== mallLoadSeqRef.current) return;
        setMallLoadError(parseError(error));
        if (page === 1) {
          queryClient.setQueryData(mallKey, undefined);
        }
        throw error;
      }
    },
    [],
  );

  const loadMoreMallBoxes = useCallback(
    async (_token: string) => {
      if (!hasMoreMallBoxes || loadingMoreMallBoxes) return;
      await mallQuery.fetchNextPage();
    },
    [hasMoreMallBoxes, loadingMoreMallBoxes, mallQuery],
  );

  const loadAddresses = useCallback(async (token: string) => {
    setAddressesLoadError(null);
    try {
      const list = await queryClient.fetchQuery({
        queryKey: queryKeys.addresses.list(token),
        queryFn: () => fetchAddressesQuery(token),
        staleTime: 60_000,
      });
      const topAddress = list.find((item) => item.top) || list[0];
      setSelectedAddressId(topAddress?.id ?? "");
    } catch (error) {
      setAddressesLoadError(parseError(error));
      throw error;
    }
  }, []);

  const loadOrders = useCallback(async (token: string) => {
    setOrdersLoadError(null);
    try {
      await queryClient.fetchInfiniteQuery({
        queryKey: queryKeys.orders.list(token),
        queryFn: ({ pageParam }) => fetchOrdersPage(token, pageParam as number),
        ...ordersInfiniteQueryOptions,
        staleTime: 15_000,
      });
      await queryClient.invalidateQueries({ queryKey: ["warehouse", "list", token] });
      setLastOrderRefreshAt(Date.now());
    } catch (error) {
      setOrdersLoadError(parseError(error));
      throw error;
    }
  }, []);

  const loadMoreOrders = useCallback(
    async (_token: string) => {
      if (!hasMoreOrders || loadingMoreOrders) return;
      await ordersQuery.fetchNextPage();
    },
    [hasMoreOrders, loadingMoreOrders, ordersQuery],
  );

  const loadOrdersDebounced = useCallback(
    async (token: string) => {
      const now = Date.now();
      if (now - lastOrderRefreshAt < ORDER_REFRESH_DEBOUNCE_MS) {
        return;
      }
      await loadOrders(token);
    },
    [lastOrderRefreshAt, loadOrders],
  );

  const refreshHomeCatalog = useCallback(
    async (token: string): Promise<string[]> => {
      const partialErrors: string[] = [];
      if (!token) {
        await loadBoxes("");
        return partialErrors;
      }
      const [boxesResult, addressResult, orderResult] = await Promise.allSettled([
        loadBoxes(token),
        loadAddresses(token),
        loadOrders(token),
      ]);
      if (boxesResult.status === "rejected") {
        throw boxesResult.reason;
      }
      if (addressResult.status === "rejected") {
        partialErrors.push(i18n.t("dataSync.addressError", { message: parseError(addressResult.reason) }));
      }
      if (orderResult.status === "rejected") {
        partialErrors.push(i18n.t("dataSync.orderError", { message: parseError(orderResult.reason) }));
      }
      return partialErrors;
    },
    [loadAddresses, loadBoxes, loadOrders],
  );

  const refreshMallCatalog = useCallback(
    async (token: string) => {
      await loadMallBoxes(token, mallCategoryId, 1, mallKeyword);
    },
    [loadMallBoxes, mallCategoryId, mallKeyword],
  );

  const refreshAll = useCallback(
    async (token: string, options?: { includeMall?: boolean }) => {
      const partialErrors = await refreshHomeCatalog(token);
      if (options?.includeMall !== false) {
        try {
          await refreshMallCatalog(token);
        } catch (error) {
          partialErrors.push(i18n.t("dataSync.mallError", { message: parseError(error) }));
        }
      }
      return partialErrors;
    },
    [refreshHomeCatalog, refreshMallCatalog],
  );

  const clearAll = useCallback(() => {
    setMallCategoryId(undefined);
    setMallKeyword(undefined);
    setSelectedAddressId("");
    setBoxesLoadError(null);
    setMallLoadError(null);
    setOrdersLoadError(null);
    setAddressesLoadError(null);
    queryClient.clear();
  }, []);

  return {
    boxes,
    hasMoreBoxes,
    loadingMoreBoxes,
    mallBoxes,
    mallCategoryId,
    mallKeyword,
    hasMoreMallBoxes,
    loadingMoreMallBoxes,
    boxesLoadError,
    mallLoadError,
    ordersLoadError,
    loadMallBoxes,
    loadMoreMallBoxes,
    addresses,
    addressesLoading,
    addressesLoadError,
    orders,
    ordersReady,
    hasMoreOrders,
    loadingMoreOrders,
    selectedAddressId,
    setSelectedAddressId,
    loadBoxes,
    loadMoreBoxes,
    loadAddresses,
    loadOrders,
    loadMoreOrders,
    loadOrdersDebounced,
    refreshAll,
    refreshHomeCatalog,
    refreshMallCatalog,
    clearAll,
  };
}

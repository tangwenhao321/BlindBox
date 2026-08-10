import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchCatalogSearchPage } from "../fetchers";
import { boxesInfiniteQueryOptions } from "../infiniteQueryHelpers";
import { queryKeys } from "../keys";

export function useCatalogSearchInfiniteQuery(token: string, keyword: string, enabled = true) {
  const trimmed = keyword.trim();
  return useInfiniteQuery({
    queryKey: queryKeys.search.catalog(token, trimmed),
    queryFn: ({ pageParam }) => fetchCatalogSearchPage(token, trimmed, pageParam),
    ...boxesInfiniteQueryOptions,
    enabled: enabled && trimmed.length > 0,
    staleTime: 30_000,
  });
}

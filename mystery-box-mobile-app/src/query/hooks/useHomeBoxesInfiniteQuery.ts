import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchHomeBoxesPage } from "../fetchers";
import { boxesInfiniteQueryOptions } from "../infiniteQueryHelpers";
import { queryKeys } from "../keys";

export function useHomeBoxesInfiniteQuery(token: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.boxes.home(token),
    queryFn: ({ pageParam }) => fetchHomeBoxesPage(token, pageParam),
    ...boxesInfiniteQueryOptions,
    enabled,
    staleTime: 30_000,
  });
}

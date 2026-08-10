import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchMallBoxesPage, type MallBoxesQueryParams } from "../fetchers";
import { boxesInfiniteQueryOptions } from "../infiniteQueryHelpers";
import { queryKeys } from "../keys";

export function useMallBoxesInfiniteQuery(
  token: string,
  params: MallBoxesQueryParams = {},
  enabled = true,
) {
  const keyword = params.keyword?.trim() || undefined;
  const categoryId = params.categoryId;
  return useInfiniteQuery({
    queryKey: queryKeys.boxes.mall(token, categoryId, keyword),
    queryFn: ({ pageParam }) => fetchMallBoxesPage(token, pageParam, { categoryId, keyword }),
    ...boxesInfiniteQueryOptions,
    enabled,
    staleTime: 30_000,
  });
}

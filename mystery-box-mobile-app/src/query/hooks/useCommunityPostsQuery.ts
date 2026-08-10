import { useInfiniteQuery } from "@tanstack/react-query";
import type { CommunityPost } from "../../services/communityService";
import { fetchCommunityPostsPage } from "../fetchers";
import { queryKeys } from "../keys";

const PAGE_SIZE = 20;

const communityPostsInfiniteOptions = {
  initialPageParam: 1,
  getNextPageParam: (
    lastPage: { items: CommunityPost[]; hasMore: boolean },
    _pages: { items: CommunityPost[]; hasMore: boolean }[],
    lastPageParam: number,
  ) => (lastPage.hasMore ? lastPageParam + 1 : undefined),
} as const;

export function useCommunityPostsQuery(token: string | undefined) {
  return useInfiniteQuery({
    queryKey: queryKeys.community.posts(token ?? ""),
    queryFn: ({ pageParam }) => fetchCommunityPostsPage(token, pageParam, PAGE_SIZE),
    ...communityPostsInfiniteOptions,
    staleTime: 30_000,
  });
}

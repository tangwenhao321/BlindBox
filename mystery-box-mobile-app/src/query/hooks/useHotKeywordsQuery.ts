import { useQuery } from "@tanstack/react-query";
import { fetchHotKeywords } from "../../services/searchHotKeywordService";
import { queryKeys } from "../keys";

export function useHotKeywordsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.search.hotKeywords(),
    queryFn: () => fetchHotKeywords(8),
    enabled,
    staleTime: 120_000,
    refetchOnWindowFocus: true,
  });
}

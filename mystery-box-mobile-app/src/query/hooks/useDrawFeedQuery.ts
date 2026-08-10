import { useQuery } from "@tanstack/react-query";
import { fetchDrawFeedPage } from "../../services/drawFeedService";
import { queryKeys } from "../keys";

export function useDrawFeedQuery(token: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.home.drawFeed(token),
    queryFn: async () => {
      const page = await fetchDrawFeedPage(token, null, 8);
      return page.items;
    },
    enabled,
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

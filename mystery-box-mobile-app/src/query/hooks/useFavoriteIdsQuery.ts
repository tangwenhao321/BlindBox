import { useQuery } from "@tanstack/react-query";
import { fetchFavoriteIdsQuery } from "../fetchers";
import { queryKeys } from "../keys";

export function useFavoriteIdsQuery(token: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.favorites.ids(token),
    queryFn: () => fetchFavoriteIdsQuery(token),
    enabled: !!token && enabled,
  });
}

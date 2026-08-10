import { useQuery } from "@tanstack/react-query";
import { queryRecommendedBoxes } from "../../services/boxService";
import { queryKeys } from "../keys";

export function useRecommendBoxesQuery(token: string | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.home.recommend(token ?? ""),
    queryFn: () => queryRecommendedBoxes(token ?? "", 8),
    enabled: enabled && !!token,
    staleTime: 120_000,
    refetchOnWindowFocus: true,
  });
}

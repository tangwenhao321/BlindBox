import { useQuery } from "@tanstack/react-query";
import { fetchHomeSummary } from "../../services/homeService";
import { queryKeys } from "../keys";

export function useHomeSummaryQuery(token = "", enabled = true) {
  return useQuery({
    queryKey: queryKeys.home.summary(token),
    queryFn: () => fetchHomeSummary(token),
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}

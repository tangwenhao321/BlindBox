import { useQuery } from "@tanstack/react-query";
import { fetchBoxAuxiliaryQuery, fetchDrawPackConfigsQuery, fetchPurchaseLimitQuery } from "../fetchers";
import { queryKeys } from "../keys";

export function useDrawPackConfigsQuery(token: string) {
  return useQuery({
    queryKey: queryKeys.boxDetails.drawPackConfigs(token),
    queryFn: () => fetchDrawPackConfigsQuery(token),
    staleTime: 60_000,
  });
}

export function useBoxAuxiliaryQuery(token: string, boxId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.boxDetails.auxiliary(token, boxId),
    queryFn: () => fetchBoxAuxiliaryQuery(token, boxId),
    enabled: !!boxId && enabled,
    staleTime: 30_000,
  });
}

export function usePurchaseLimitQuery(token: string, boxId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.boxDetails.purchaseLimit(token, boxId),
    queryFn: () => fetchPurchaseLimitQuery(token, boxId),
    enabled: !!token && !!boxId && enabled,
    staleTime: 30_000,
  });
}

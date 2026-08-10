import { useQuery } from "@tanstack/react-query";
import { fetchWarehouseItemsQuery } from "../fetchers";
import { queryKeys } from "../keys";

export function useWarehouseItemsQuery(
  token: string,
  pendingOnly = false,
  limit = 50,
  offset = 0,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.warehouse.list(token, pendingOnly, limit, offset),
    queryFn: () => fetchWarehouseItemsQuery(token, pendingOnly, limit, offset),
    enabled: !!token && enabled,
    staleTime: 30_000,
  });
}

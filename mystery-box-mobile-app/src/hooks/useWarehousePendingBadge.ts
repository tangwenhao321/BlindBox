import { useCallback, useEffect } from "react";
import { fetchWarehouseItemCount } from "../services/warehouseService";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../query/keys";

/** 与仓库「待处理」列表一致的角标数量（按件，非订单数）。 */
export function useWarehousePendingBadge(authToken: string, refreshKey: number) {
  const query = useQuery({
    queryKey: queryKeys.warehouse.count(authToken, true),
    queryFn: () => fetchWarehouseItemCount(authToken, true),
    enabled: !!authToken,
    staleTime: 30_000,
  });

  const refresh = useCallback(async () => {
    if (!authToken) return;
    await query.refetch();
  }, [authToken, query]);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);

  return {
    warehousePendingCount: query.data?.count ?? 0,
    warehousePendingCountApproximate: query.data?.approximate === true,
    refreshWarehouseBadge: refresh,
  };
}

import { useQuery } from "@tanstack/react-query";
import { fetchWarehouseItems } from "../services/warehouseService";
import { queryKeys } from "../query/keys";

/** Backend caps warehouse list at 100 items per request. */
export const ORDER_WAREHOUSE_LIST_LIMIT = 100;

/** Warehouse inventory used by order tabs (ALL + ship requests). */
export function useOrderWarehouseItems(authToken: string) {
  return useQuery({
    queryKey: queryKeys.warehouse.list(authToken, false, ORDER_WAREHOUSE_LIST_LIMIT, 0),
    queryFn: () => fetchWarehouseItems(authToken, false, ORDER_WAREHOUSE_LIST_LIMIT),
    enabled: !!authToken,
    staleTime: 15_000,
  });
}

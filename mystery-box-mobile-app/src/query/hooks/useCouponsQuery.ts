import { useQuery } from "@tanstack/react-query";
import { fetchCouponsQuery } from "../fetchers";
import { queryKeys } from "../keys";

export function useCouponsQuery(token: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.coupons.list(token),
    queryFn: () => fetchCouponsQuery(token),
    enabled: !!token && enabled,
  });
}

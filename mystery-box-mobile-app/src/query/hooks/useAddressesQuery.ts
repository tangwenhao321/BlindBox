import { useQuery } from "@tanstack/react-query";
import { fetchAddressesQuery } from "../fetchers";
import { queryKeys } from "../keys";

export function useAddressesQuery(token: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.addresses.list(token),
    queryFn: () => fetchAddressesQuery(token),
    enabled: !!token && enabled,
    staleTime: 60_000,
  });
}

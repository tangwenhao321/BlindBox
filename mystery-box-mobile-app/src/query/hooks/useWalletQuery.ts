import { useQuery } from "@tanstack/react-query";
import { fetchWalletQuery } from "../fetchers";
import { queryKeys } from "../keys";

export function useWalletQuery(token: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.wallet.profile(token),
    queryFn: () => fetchWalletQuery(token),
    enabled: !!token && enabled,
    staleTime: 30_000,
  });
}

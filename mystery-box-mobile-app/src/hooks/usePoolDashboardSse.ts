import { useCallback } from "react";
import { fetchPoolDashboard, type PoolDashboard } from "../services/poolDashboardService";
import { useSsePoll } from "./useSsePoll";

export function usePoolDashboardSse(
  token: string | undefined,
  boxId: string,
  enabled: boolean,
  onDashboard: (dashboard: PoolDashboard) => void,
) {
  const pollFetch = useCallback(() => fetchPoolDashboard(token, boxId).then((d) => {
    if (!d) throw new Error("empty");
    return d;
  }), [token, boxId]);

  useSsePoll<PoolDashboard>({
    path: `/front/mystery-box/${boxId}/pool-stream`,
    enabled,
    eventName: "POOL_UPDATE",
    pollMs: 3000,
    pollFetch,
    onData: onDashboard,
  });
}

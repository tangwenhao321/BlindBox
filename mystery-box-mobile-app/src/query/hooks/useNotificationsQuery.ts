import { useQuery } from "@tanstack/react-query";
import { fetchNotificationsQuery } from "../fetchers";
import { queryKeys } from "../keys";

export function useNotificationsQuery(token: string | undefined, limit = 30) {
  return useQuery({
    queryKey: queryKeys.notifications.list(token ?? "", limit),
    queryFn: () => fetchNotificationsQuery(token!, limit),
    enabled: !!token,
  });
}

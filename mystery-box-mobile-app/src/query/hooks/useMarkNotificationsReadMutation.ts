import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markNotificationsRead as markServerRead } from "../../services/notificationService";
import { invalidateNotificationQueries } from "../../utils/invalidateAppQueries";

export function useMarkNotificationsReadMutation(token: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => {
      if (!token || !ids.length) return Promise.resolve();
      return markServerRead(token, ids);
    },
    onSuccess: (_data, ids) => {
      if (token && ids.length) invalidateNotificationQueries(token);
      void queryClient.invalidateQueries({ queryKey: ["notifications", "list", token ?? ""] });
    },
  });
}

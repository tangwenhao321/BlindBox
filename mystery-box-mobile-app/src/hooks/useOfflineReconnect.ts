import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { queryClient } from "../query/queryClient";
import { flushOfflineMutationQueue } from "../offline/offlineMutationQueue";
import { subscribeOffline } from "../utils/connectivity";
import { toast } from "../utils/toast";

/** Flush queued offline mutations when connectivity returns. */
export function useOfflineReconnect() {
  const { t } = useTranslation();
  useEffect(() => {
    let wasOffline = false;
    return subscribeOffline((offline) => {
      if (wasOffline && !offline) {
        void flushOfflineMutationQueue().then((result) => {
          if (result.processed > 0) {
            toast.success(t("offline.syncSuccess", { count: result.processed }));
            void queryClient.invalidateQueries();
          } else if (result.stoppedOnError) {
            toast.info(t("offline.syncPartialFail"));
          }
        });
      }
      wasOffline = offline;
    });
  }, [t]);
}

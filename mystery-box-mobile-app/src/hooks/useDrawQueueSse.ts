import { useCallback, useRef } from "react";
import i18n from "../i18n";
import { fetchQueueStatus, renewDrawQueue, type QueueStatus } from "../services/drawQueueService";
import { toast } from "../utils/toast";
import { useSsePoll } from "./useSsePoll";

export function useDrawQueueSse(
  token: string | undefined,
  boxId: string,
  enabled: boolean,
  onStatus: (status: QueueStatus) => void,
) {
  const pollFetch = useCallback(async () => {
    if (!token) throw new Error("no token");
    try {
      return await renewDrawQueue(token, boxId);
    } catch {
      return fetchQueueStatus(token, boxId);
    }
  }, [token, boxId]);

  const pollDegradedShown = useRef(false);
  const onPollDegraded = useCallback(() => {
    if (pollDegradedShown.current) return;
    pollDegradedShown.current = true;
    toast.error(i18n.t("boxDetails.queuePollFailed"));
  }, []);

  useSsePoll<QueueStatus>({
    path: `/front/mystery-box/${boxId}/draw-queue/stream`,
    token,
    enabled: enabled && !!token,
    eventName: "QUEUE_STATUS",
    pollMs: 1000,
    pollFetch,
    onData: onStatus,
    onPollDegraded,
  });
}

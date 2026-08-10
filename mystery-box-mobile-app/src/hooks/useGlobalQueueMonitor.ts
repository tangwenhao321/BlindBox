import { useEffect, useRef } from "react";
import { fetchQueueStatus } from "../services/drawQueueService";
import { clearActiveQueueSession, getActiveQueueSession } from "../utils/queueSessionStorage";
import { notifyQueueYourTurn } from "../utils/queueTurnNotification";

const POLL_MS = 2000;

/** Poll queue status app-wide when user left box details while still in queue. */
export function useGlobalQueueMonitor(authToken?: string) {
  const prevCanDraw = useRef(false);

  useEffect(() => {
    if (!authToken) return;

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = async () => {
      const session = await getActiveQueueSession();
      if (!session || cancelled) return;
      try {
        const status = await fetchQueueStatus(authToken, session.boxId);
        if (cancelled) return;
        if (status.canDraw && !prevCanDraw.current) {
          void notifyQueueYourTurn({ authToken });
        }
        prevCanDraw.current = status.canDraw;
        if (status.canDraw || status.position <= 0) {
          await clearActiveQueueSession();
          prevCanDraw.current = false;
        }
      } catch {
        // keep session; retry on next tick
      }
    };

    void getActiveQueueSession().then((session) => {
      if (!session || cancelled) return;
      prevCanDraw.current = false;
      void tick();
      timer = setInterval(() => void tick(), POLL_MS);
    });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [authToken]);
}

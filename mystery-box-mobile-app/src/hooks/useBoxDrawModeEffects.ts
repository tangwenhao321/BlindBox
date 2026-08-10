import { useEffect, useRef, useState } from "react";
import i18n from "../i18n";
import type { DrawMode } from "../services/orderService";
import {
  acquireBuyoutLock,
  fetchBuyoutLockStatus,
  fetchQueueStatus,
  joinDrawQueue,
  renewBuyoutLock,
  type QueueStatus,
} from "../services/drawQueueService";
import { releasePoolSlotReserve } from "../services/poolSlotService";
import { parseError } from "../api";
import { useDrawQueueSse } from "./useDrawQueueSse";
import type { DrawPackConfig } from "../services/drawPackService";
import { toast } from "../utils/toast";
import {
  clearActiveQueueSession,
  setActiveQueueSession,
} from "../utils/queueSessionStorage";
import { trackEvent } from "../utils/analytics";
import { ANALYTICS_EVENTS } from "../utils/analyticsEvents";
import { isNetworkErrorMessage } from "../utils/connectivity";

type Params = {
  authToken?: string;
  boxId: string;
  boxName?: string;
  isLoggedIn: boolean;
  poolRemaining: number;
  drawConfigs: DrawPackConfig[];
  drawCount: number;
  onChangeDrawCount: (count: number) => void;
};

export function useBoxDrawModeEffects(params: Params) {
  const { authToken, boxId, boxName, isLoggedIn, poolRemaining, drawConfigs, drawCount, onChangeDrawCount } =
    params;
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [drawMode, setDrawMode] = useState<DrawMode>("instant");
  const [buyoutLockTtl, setBuyoutLockTtl] = useState(0);
  const [buyoutLockHeld, setBuyoutLockHeld] = useState(true);
  const [selectedSlotNo, setSelectedSlotNo] = useState<number | null>(null);
  const prevDrawMode = useRef<DrawMode>("instant");

  useDrawQueueSse(authToken, boxId, drawMode === "queue" && isLoggedIn, setQueueStatus);

  useEffect(() => {
    if (drawMode === "cabinet" || !authToken) return;
    if (prevDrawMode.current === "cabinet" && selectedSlotNo != null) {
      void releasePoolSlotReserve(authToken, boxId).catch(() => undefined);
      setSelectedSlotNo(null);
    }
    prevDrawMode.current = drawMode;
  }, [authToken, boxId, drawMode, selectedSlotNo]);

  useEffect(() => {
    if (drawMode !== "queue" || !authToken || !isLoggedIn) {
      setQueueStatus(null);
      void clearActiveQueueSession();
      return;
    }
    let cancelled = false;
    void joinDrawQueue(authToken, boxId)
      .then((status) => {
        if (!cancelled) {
          setQueueStatus(status);
          void setActiveQueueSession({ boxId, boxName: boxName ?? boxId });
          trackEvent(ANALYTICS_EVENTS.QUEUE_JOIN, { boxId, position: status.position });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setQueueStatus(null);
          toast.error(i18n.t("boxDetails.joinQueueFailed", { message: parseError(error) }));
          setDrawMode("instant");
          void clearActiveQueueSession();
        }
      });
    return () => {
      cancelled = true;
      trackEvent(ANALYTICS_EVENTS.QUEUE_LEAVE, { boxId, reason: "unmount" });
    };
  }, [drawMode, authToken, isLoggedIn, boxId, boxName]);

  useEffect(() => {
    if (drawMode !== "queue" || !queueStatus) return;
    if (queueStatus.canDraw || queueStatus.position <= 0) {
      void clearActiveQueueSession();
    }
  }, [drawMode, queueStatus?.canDraw, queueStatus?.position]);

  useEffect(() => {
    if (drawMode !== "buyout" || !authToken || !isLoggedIn) {
      setBuyoutLockTtl(0);
      return;
    }
    void acquireBuyoutLock(authToken, boxId).catch((error) => {
      toast.error(String(error));
      setDrawMode("instant");
    });
    const timer = setInterval(() => {
      void renewBuyoutLock(authToken, boxId)
        .then(() => fetchBuyoutLockStatus(authToken, boxId))
        .then((lock) => fetchQueueStatus(authToken, boxId).then((status) => ({ lock, status })))
        .then(({ lock, status }) => {
          setBuyoutLockTtl(lock.lockTtlSeconds ?? status.lockTtlSeconds ?? 0);
          const held = status.lockHeldByMe ?? lock.holderUserId != null;
          setBuyoutLockHeld(held);
          if (!held) {
            toast.error(i18n.t("boxDetails.buyoutLockLost"));
            setDrawMode("instant");
          }
        })
        .catch((error) => {
          const message = parseError(error);
          toast.error(
            isNetworkErrorMessage(message)
              ? i18n.t("boxDetails.buyoutRenewFailed", { message })
              : i18n.t("boxDetails.buyoutLockLostRetry"),
          );
          setBuyoutLockHeld(false);
          setDrawMode("instant");
        });
    }, 5000);
    return () => clearInterval(timer);
  }, [drawMode, authToken, isLoggedIn, boxId]);

  useEffect(() => {
    if (drawMode !== "buyout" || poolRemaining <= 0) return;
    const maxPack = drawConfigs.reduce((max, c) => Math.max(max, c.drawCount), drawCount);
    const target = Math.min(poolRemaining, maxPack > 0 ? maxPack : poolRemaining);
    if (target !== drawCount) onChangeDrawCount(target);
  }, [drawMode, poolRemaining, drawConfigs, drawCount, onChangeDrawCount]);

  const buyoutBlocked = drawMode === "buyout" && !buyoutLockHeld;
  const queueBlocked =
    drawMode === "queue" && queueStatus != null && !queueStatus.canDraw && queueStatus.position > 0;

  const cabinetBlocked = drawMode === "cabinet" && selectedSlotNo == null;

  return {
    drawMode,
    setDrawMode,
    queueStatus,
    buyoutLockTtl,
    buyoutLockHeld,
    buyoutBlocked,
    queueBlocked,
    cabinetBlocked,
    selectedSlotNo,
    setSelectedSlotNo,
  };
}

import { useCallback, useEffect, useRef, useState } from "react";
import type { Product } from "../types";
import { scheduleChainedRevealTrigger } from "../effects/revealChainAdvance";
import { computeInterRevealGapMs } from "../effects/revealSequenceEngine";
import type { CeremonyTier } from "../effects/ceremonyTier";
import { REVEAL_BOOT_DELAY_MS, resolveRevealBootAction } from "../effects/revealSessionController";
import type { RevealSource } from "../effects/revealOrchestrator";

type Params = {
  enabled: boolean;
  orderId: string;
  source: RevealSource;
  products: Product[];
  pendingPayment?: boolean;
  preferSettlementOnSeen?: boolean;
  onPlay: () => void;
  onSkipToSettlement?: () => void;
  onSkipToPrizes?: () => void;
  onQueued?: () => void;
  onOfflineBlocked?: () => void;
};

/** Shared boot + inter-reveal gap scheduling for modal and details. */
export function useRevealSequence({
  enabled,
  orderId,
  source,
  products,
  pendingPayment,
  preferSettlementOnSeen,
  onPlay,
  onSkipToSettlement,
  onSkipToPrizes,
  onQueued,
  onOfflineBlocked,
}: Params) {
  const bootedRef = useRef<string | null>(null);
  const wasPendingRef = useRef(!!pendingPayment);
  const [revealIndex, setRevealIndex] = useState(0);
  const [sequenceActive, setSequenceActive] = useState(false);
  const skipRemainingRef = useRef(false);

  const scheduleBoot = useCallback((trigger: () => void) => {
    const timer = setTimeout(trigger, REVEAL_BOOT_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (wasPendingRef.current && !pendingPayment) {
      bootedRef.current = null;
    }
    wasPendingRef.current = !!pendingPayment;
  }, [pendingPayment]);

  useEffect(() => {
    if (!enabled || !orderId || products.length === 0) {
      bootedRef.current = null;
      setSequenceActive(false);
      return;
    }
    if (bootedRef.current === orderId) return;
    bootedRef.current = orderId;
    skipRemainingRef.current = false;
    setRevealIndex(0);

    const decision = resolveRevealBootAction(orderId, source, {
      pendingPayment,
      prizes: products,
      preferSettlementOnSeen,
    });

    switch (decision.action) {
      case "play":
        setSequenceActive(true);
        return scheduleBoot(onPlay);
      case "skip_to_settlement":
        onSkipToSettlement?.();
        break;
      case "skip_to_prizes":
        onSkipToPrizes?.();
        break;
      case "queue":
        onQueued?.();
        break;
      case "block_offline":
        onOfflineBlocked?.();
        break;
    }
  }, [
    enabled,
    orderId,
    source,
    products,
    pendingPayment,
    preferSettlementOnSeen,
    onPlay,
    onSkipToSettlement,
    onSkipToPrizes,
    onQueued,
    onOfflineBlocked,
    scheduleBoot,
  ]);

  const scheduleNextReveal = useCallback(
    (opts: {
      currentIndex: number;
      total: number;
      trigger: () => void;
      paused?: boolean;
      ceremony?: CeremonyTier;
    }) => {
      const { currentIndex, total, trigger, paused, ceremony } = opts;
      if (paused || skipRemainingRef.current || total <= 1 || currentIndex <= 0 || currentIndex >= total) {
        return undefined;
      }
      const completedIndex = currentIndex - 1;
      if (total > 1) {
        return scheduleChainedRevealTrigger(completedIndex, total, trigger, ceremony, orderId);
      }
      const gapMs = computeInterRevealGapMs(completedIndex, products);
      const timer = setTimeout(trigger, gapMs);
      return () => clearTimeout(timer);
    },
    [products, orderId],
  );

  const markSkipRemaining = useCallback(() => {
    skipRemainingRef.current = true;
  }, []);

  return {
    revealIndex,
    setRevealIndex,
    sequenceActive,
    setSequenceActive,
    skipRemainingRef,
    scheduleBoot,
    scheduleNextReveal,
    markSkipRemaining,
  };
}

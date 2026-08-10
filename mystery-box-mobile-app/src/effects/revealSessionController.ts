import type { Product } from "../types";
import {
  enqueueRevealTask,
  hasOrderRevealBeenSeen,
  tryAcquireAutoPlay,
  type AutoPlayResult,
  type RevealSource,
} from "./revealOrchestrator";
import { isOfflineRevealBlocked } from "./revealOfflineMode";

export type RevealBootAction =
  | "play"
  | "skip_to_settlement"
  | "skip_to_prizes"
  | "queue"
  | "block_offline";

export type RevealBootDecision = {
  action: RevealBootAction;
  reason: AutoPlayResult | "offline_blocked";
};

type BootOpts = {
  pendingPayment?: boolean;
  prizes?: Product[];
  preferSettlementOnSeen?: boolean;
};

/** Unified auto-play decision for modal and details entry points. */
export function resolveRevealBootAction(
  orderId: string,
  source: RevealSource,
  opts: BootOpts = {},
): RevealBootDecision {
  if (isOfflineRevealBlocked()) {
    return { action: "block_offline", reason: "offline_blocked" };
  }

  const acquire = tryAcquireAutoPlay(orderId, source, {
    pendingPayment: opts.pendingPayment,
    prizes: opts.prizes,
  });

  if (acquire === "allowed") {
    return { action: "play", reason: acquire };
  }

  if (acquire === "blocked_by_active") {
    if (source === "modal") {
      enqueueRevealTask(orderId, source, "modal");
      return { action: "queue", reason: acquire };
    }
    return { action: "skip_to_prizes", reason: acquire };
  }

  if (acquire === "blocked_seen" || hasOrderRevealBeenSeen(orderId)) {
    return {
      action: opts.preferSettlementOnSeen ? "skip_to_settlement" : "play",
      reason: acquire === "blocked_seen" ? acquire : "blocked_seen",
    };
  }

  if (acquire === "blocked_invalid_prizes") {
    return { action: "skip_to_prizes", reason: acquire };
  }

  if (acquire === "blocked_pending_payment") {
    return { action: "skip_to_prizes", reason: acquire };
  }

  return { action: "skip_to_prizes", reason: acquire };
}

export const REVEAL_BOOT_DELAY_MS = 80;

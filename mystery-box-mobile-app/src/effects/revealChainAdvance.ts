import type { CeremonyTier } from "./ceremonyTier";
import { resolveChainRevealDelayMs } from "./revealSequenceEngine";

/** Schedule the next draw reveal after the current one finishes (multi-draw). */
export function scheduleChainedRevealTrigger(
  completedIndex: number,
  total: number,
  trigger: () => void,
  ceremony?: CeremonyTier,
  orderId?: string,
): () => void {
  if (total <= 1 || completedIndex >= total - 1) {
    return () => undefined;
  }
  const delayMs = resolveChainRevealDelayMs(completedIndex, total, ceremony, orderId);
  const timer = setTimeout(trigger, delayMs);
  return () => clearTimeout(timer);
}

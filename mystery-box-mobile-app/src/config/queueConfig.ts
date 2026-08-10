/**
 * Optional queue head timeout (seconds). Backend may expose `queue.head-timeout-sec`;
 * mobile reads EXPO_PUBLIC_QUEUE_HEAD_TIMEOUT_SEC until a config API is wired.
 */
export function getQueueHeadTimeoutSec(): number | undefined {
  const raw = process.env.EXPO_PUBLIC_QUEUE_HEAD_TIMEOUT_SEC?.trim();
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

/** Stub: true when client should treat queue head as expired (server config TBD). */
export function isQueueHeadExpired(headSinceMs: number | undefined, nowMs = Date.now()): boolean {
  const timeoutSec = getQueueHeadTimeoutSec();
  if (!timeoutSec || headSinceMs == null) return false;
  return nowMs - headSinceMs >= timeoutSec * 1000;
}

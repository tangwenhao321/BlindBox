import type { QueueStatus } from "../services/drawQueueService";

export function resolveQueueProgress(queueStatus: QueueStatus | null | undefined): number {
  if (!queueStatus || queueStatus.total <= 0) return 0;
  if (queueStatus.canDraw) return 1;
  return Math.min(1, Math.max(0, (queueStatus.total - queueStatus.position + 1) / queueStatus.total));
}

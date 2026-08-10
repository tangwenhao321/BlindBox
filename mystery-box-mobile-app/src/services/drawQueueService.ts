import { api, buildAuthHeaders } from "../api";

export type QueueStatus = {
  position: number;
  total: number;
  queueSize?: number;
  estimatedWaitSec?: number;
  canDraw: boolean;
  lockTtlSeconds?: number;
  lockHolderUserId?: string | null;
  queueExpiresInSeconds?: number;
  lockHeldByMe?: boolean;
};

function unwrapQueueStatus(data: { result?: QueueStatus } & QueueStatus): QueueStatus {
  return data.result ?? data;
}

export async function joinDrawQueue(token: string, boxId: string): Promise<QueueStatus> {
  const response = await api.post(`/front/mystery-box/${boxId}/draw-queue/join`, {}, {
    headers: buildAuthHeaders(token),
  });
  return unwrapQueueStatus(response.data);
}

export async function fetchQueueStatus(token: string, boxId: string): Promise<QueueStatus> {
  const response = await api.get(`/front/mystery-box/${boxId}/draw-queue/status`, {
    headers: buildAuthHeaders(token),
  });
  return unwrapQueueStatus(response.data);
}

export async function renewDrawQueue(token: string, boxId: string): Promise<QueueStatus> {
  const response = await api.post(`/front/mystery-box/${boxId}/draw-queue/renew`, {}, {
    headers: buildAuthHeaders(token),
  });
  return unwrapQueueStatus(response.data);
}

export async function acquireBuyoutLock(token: string, boxId: string): Promise<void> {
  await api.post(`/front/mystery-box/${boxId}/draw-queue/buyout-lock`, {}, { headers: buildAuthHeaders(token) });
}

export async function renewBuyoutLock(token: string, boxId: string): Promise<void> {
  await api.post(`/front/mystery-box/${boxId}/draw-queue/buyout-lock/renew`, {}, {
    headers: buildAuthHeaders(token),
  });
}

export async function fetchBuyoutLockStatus(
  token: string,
  boxId: string,
): Promise<{ holderUserId: string | null; lockTtlSeconds: number }> {
  const response = await api.get<{
    result: { holderUserId: string | null; lockTtlSeconds: number };
  }>(`/front/mystery-box/${boxId}/draw-queue/buyout-lock`, {
    headers: buildAuthHeaders(token),
  });
  return response.data.result ?? { holderUserId: null, lockTtlSeconds: 0 };
}

export async function releaseBuyoutLock(token: string, boxId: string): Promise<void> {
  await api.delete(`/front/mystery-box/${boxId}/draw-queue/buyout-lock`, { headers: buildAuthHeaders(token) });
}

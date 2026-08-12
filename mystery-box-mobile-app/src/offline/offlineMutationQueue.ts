import { executePersistedOfflineMutation } from "./offlineMutationExecutor";
import {
  appendPersistedMutation,
  clearPersistedMutations,
  loadPersistedMutations,
  removePersistedMutation,
} from "./offlineMutationStorage";
import type { OfflinePersistInput, PersistedOfflineMutation } from "./offlineMutationTypes";
import { offlineOwnerKeyFromToken } from "./offlineMutationTypes";
import { getSessionAuthToken } from "../utils/authTokenStore";
import { offlineKindToActionKey } from "../utils/offlineKindActionKey";
import { MOCK_PAYMENT_ENABLED } from "../config/constants";

type QueuedMutation = {
  id: string;
  label: string;
  run: () => Promise<void>;
  persisted: boolean;
};

type QueueListener = (snapshot: OfflineQueueSnapshot) => void;

const queue: QueuedMutation[] = [];
const listeners = new Set<QueueListener>();
let hydrated = false;

const MONEY_KINDS = new Set<OfflinePersistInput["kind"]>([
  "createOrder",
  "redeem",
  "mockPayment",
  "marketplaceBuy",
  "marketplaceList",
  "applyRefund",
  "exchangeFragment",
  "decomposeOrderItem",
]);

export type OfflineQueueItem = {
  id: string;
  label: string;
};

export type OfflineQueueSnapshot = {
  count: number;
  labels: string[];
  items: OfflineQueueItem[];
};

function buildSnapshot(): OfflineQueueSnapshot {
  const items = queue.map((item) => ({ id: item.id, label: item.label }));
  return { count: items.length, labels: items.map((item) => item.label), items };
}

function notify() {
  const snapshot = buildSnapshot();
  listeners.forEach((listener) => listener(snapshot));
}

function normalizePersistedLabel(item: PersistedOfflineMutation): string {
  const key = offlineKindToActionKey(item.kind);
  if (item.label === key || item.label.startsWith("offline.")) return item.label;
  return key;
}

function normalizeQueueLabel(label: string, kind?: OfflinePersistInput["kind"]): string {
  if (label.startsWith("offline.")) return label;
  if (kind) return offlineKindToActionKey(kind);
  return label;
}

function buildRunFromPersisted(item: PersistedOfflineMutation): () => Promise<void> {
  return async () => {
    const session = getSessionAuthToken();
    const sessionKey = session ? offlineOwnerKeyFromToken(session) : "";
    if (item.ownerKey && sessionKey && item.ownerKey !== sessionKey) {
      await removePersistedMutation(item.id);
      throw new Error("offline.owner_mismatch");
    }
    await executePersistedOfflineMutation(item);
    await removePersistedMutation(item.id);
  };
}

export function getPendingOfflineMutationCount(): number {
  return queue.length;
}

export function subscribeOfflineMutationQueue(listener: QueueListener): () => void {
  listeners.add(listener);
  listener(buildSnapshot());
  return () => listeners.delete(listener);
}

export function enqueueOfflineMutation(
  label: string,
  run: () => Promise<void>,
  persist?: OfflinePersistInput,
): string {
  if (persist?.kind === "mockPayment" && !MOCK_PAYMENT_ENABLED && !__DEV__) {
    throw new Error("offline.mock_payment_disabled");
  }
  // Release builds: never queue money-moving actions offline (avoid delayed/cross-session replay).
  if (persist && MONEY_KINDS.has(persist.kind) && !__DEV__) {
    throw new Error("offline.money_kind_disabled");
  }
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const persisted = Boolean(persist);
  const queueLabel = normalizeQueueLabel(label, persist?.kind);
  queue.push({ id, label: queueLabel, run, persisted });
  if (persist) {
    const record: PersistedOfflineMutation = {
      id,
      label: queueLabel,
      kind: persist.kind,
      ownerKey: offlineOwnerKeyFromToken(persist.token),
      payload: persist.payload,
      createdAt: Date.now(),
    };
    void appendPersistedMutation(record);
  }
  notify();
  return id;
}

export function removeOfflineMutation(id: string): void {
  const index = queue.findIndex((item) => item.id === id);
  if (index >= 0) {
    queue.splice(index, 1);
    notify();
  }
  void removePersistedMutation(id);
}

export async function retryOfflineMutationById(id: string): Promise<boolean> {
  const index = queue.findIndex((item) => item.id === id);
  if (index < 0) return false;
  const item = queue[index];
  try {
    await item.run();
    queue.splice(index, 1);
    notify();
    return true;
  } catch {
    return false;
  }
}

export type FlushOfflineQueueResult = {
  processed: number;
  stoppedOnError: boolean;
};

/** Optional head timeout (ms) when backend exposes queue.head-timeout-sec config. */
export function getOfflineQueueHeadTimeoutMs(): number | undefined {
  const raw = process.env.EXPO_PUBLIC_OFFLINE_QUEUE_HEAD_TIMEOUT_MS?.trim();
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function isOfflineQueueHeadStale(createdAt: number, nowMs = Date.now()): boolean {
  const timeoutMs = getOfflineQueueHeadTimeoutMs();
  if (!timeoutMs) return false;
  return nowMs - createdAt >= timeoutMs;
}

export async function flushOfflineMutationQueue(): Promise<FlushOfflineQueueResult> {
  let processed = 0;
  while (queue.length > 0) {
    const next = queue[0];
    try {
      await next.run();
      queue.shift();
      notify();
      processed += 1;
    } catch {
      return { processed, stoppedOnError: true };
    }
  }
  return { processed, stoppedOnError: false };
}

export function clearOfflineMutationQueue(): void {
  queue.length = 0;
  notify();
  void clearPersistedMutations();
}

/** Load disk-backed mutations into the in-memory queue (once per session). */
export async function hydrateOfflineMutationQueue(): Promise<number> {
  if (hydrated) return 0;
  hydrated = true;
  const persisted = await loadPersistedMutations();
  const session = getSessionAuthToken();
  const sessionKey = session ? offlineOwnerKeyFromToken(session) : "";
  const existingIds = new Set(queue.map((item) => item.id));
  let added = 0;
  for (const item of persisted) {
    if (existingIds.has(item.id)) continue;
    if (item.ownerKey && sessionKey && item.ownerKey !== sessionKey) {
      void removePersistedMutation(item.id);
      continue;
    }
    // Drop legacy money mutations without ownerKey on hydrate when a session exists.
    if (!item.ownerKey && sessionKey && MONEY_KINDS.has(item.kind)) {
      void removePersistedMutation(item.id);
      continue;
    }
    // Drop money mutations on release builds (never replay createOrder/redeem/etc offline).
    if (!__DEV__ && MONEY_KINDS.has(item.kind)) {
      void removePersistedMutation(item.id);
      continue;
    }
    const label = normalizePersistedLabel(item);
    queue.push({
      id: item.id,
      label,
      run: buildRunFromPersisted(item),
      persisted: true,
    });
    added += 1;
  }
  if (added > 0) notify();
  return added;
}

/** Test helpers */
export function resetOfflineMutationQueueForTests(): void {
  queue.length = 0;
  hydrated = false;
  notify();
}

export function getOfflineMutationLabelsForTests(): string[] {
  return buildSnapshot().labels;
}

export function getOfflineQueueSnapshot(): OfflineQueueSnapshot {
  return buildSnapshot();
}

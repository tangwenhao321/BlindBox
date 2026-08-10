import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Product } from "../types";
import { clearRevealProgress, loadRevealProgress, saveRevealProgress } from "../utils/revealProgressStorage";

const SEEN_STORAGE_KEY = "reveal_seen_orders_v1";

export type RevealSource = "modal" | "details" | "spectator";
export type RevealStackTier = "modal" | "details" | "replay" | "spectator";
export type RevealPhase = "idle" | "playing" | "summary" | "interrupted" | "paused";
export type RevealResumeIntent = "continue" | "jump_to_summary";

export type AutoPlayResult =
  | "allowed"
  | "blocked_by_active"
  | "blocked_seen"
  | "blocked_pending_payment"
  | "blocked_invalid_prizes";

export type RevealProgressSnapshot = {
  orderId: string;
  source: RevealSource;
  phase: RevealPhase;
  revealIndex: number;
  revealedProductIds: string[];
  skipRemaining: boolean;
  resumeIntent: RevealResumeIntent;
  highlightMarkers?: number[];
  updatedAt: number;
};

type ActiveSession = {
  orderId: string;
  source: RevealSource;
  phase: RevealPhase;
};

const seenOrderRevealIds = new Set<string>();
let seenHydrated = false;
const seenListeners = new Set<() => void>();

async function hydrateSeenOrders(): Promise<void> {
  if (seenHydrated) return;
  seenHydrated = true;
  try {
    const raw = await AsyncStorage.getItem(SEEN_STORAGE_KEY);
    if (!raw) return;
    const ids = JSON.parse(raw) as string[];
    ids.forEach((id) => {
      if (id) seenOrderRevealIds.add(id);
    });
  } catch {
    // ignore corrupt storage
  }
}

async function persistSeenOrders(): Promise<void> {
  await AsyncStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify([...seenOrderRevealIds]));
  seenListeners.forEach((fn) => fn());
}

export function subscribeSeenOrderReveal(listener: () => void): () => void {
  seenListeners.add(listener);
  return () => seenListeners.delete(listener);
}

void hydrateSeenOrders();
let activeSession: ActiveSession | null = null;
let foregroundSessionId = `${Date.now()}`;
let backgroundIdleSince: number | null = null;
const activeRevealListeners = new Set<(session: ActiveSession | null) => void>();

function notifyActiveRevealListeners(): void {
  activeRevealListeners.forEach((listener) => listener(activeSession));
}

export function subscribeActiveReveal(listener: (session: ActiveSession | null) => void): () => void {
  activeRevealListeners.add(listener);
  listener(activeSession);
  return () => {
    activeRevealListeners.delete(listener);
  };
}

export function getForegroundSessionId(): string {
  return foregroundSessionId;
}

export function markBackgroundIdle(since = Date.now()): void {
  backgroundIdleSince = since;
}

export function markForegroundResume(): void {
  backgroundIdleSince = null;
}

export function getBackgroundIdleSince(): number | null {
  return backgroundIdleSince;
}

export function clearSeenForSession(): void {
  seenOrderRevealIds.clear();
  foregroundSessionId = `${Date.now()}`;
}
let pendingPaymentBlocked = false;
const STACK_RANK: Record<RevealStackTier, number> = { modal: 4, details: 3, replay: 2, spectator: 1 };
let activeStackTier: RevealStackTier | null = null;

export type RevealQueuePriority = "modal" | "details_auto" | "manual_replay" | "spectator";
const QUEUE_RANK: Record<RevealQueuePriority, number> = {
  modal: 4,
  details_auto: 3,
  manual_replay: 2,
  spectator: 1,
};

export type RevealQueueTask = {
  orderId: string;
  source: RevealSource;
  priority: RevealQueuePriority;
  enqueuedAt: number;
};

const revealQueue: RevealQueueTask[] = [];
let queueListener: ((task: RevealQueueTask | null) => void) | null = null;

export function subscribeRevealQueue(listener: (task: RevealQueueTask | null) => void) {
  queueListener = listener;
  listener(peekRevealQueueHead());
  return () => {
    if (queueListener === listener) queueListener = null;
  };
}

export function enqueueRevealTask(
  orderId: string,
  source: RevealSource,
  priority: RevealQueuePriority,
): boolean {
  if (!orderId) return false;
  if (revealQueue.some((t) => t.orderId === orderId)) return true;
  if (activeSession?.phase === "playing" && activeSession.orderId !== orderId) {
    revealQueue.push({ orderId, source, priority, enqueuedAt: Date.now() });
    revealQueue.sort((a, b) => QUEUE_RANK[b.priority] - QUEUE_RANK[a.priority] || a.enqueuedAt - b.enqueuedAt);
    queueListener?.(peekRevealQueueHead());
    return false;
  }
  return true;
}

export function dequeueRevealTask(orderId: string): RevealQueueTask | null {
  const idx = revealQueue.findIndex((t) => t.orderId === orderId);
  if (idx >= 0) revealQueue.splice(idx, 1);
  const next = peekRevealQueueHead();
  queueListener?.(next);
  return next;
}

export function peekRevealQueueHead(): RevealQueueTask | null {
  return revealQueue[0] ?? null;
}

export function getRevealQueueLength(): number {
  return revealQueue.length;
}

export function resetRevealQueueForTests(): void {
  revealQueue.length = 0;
  queueListener = null;
}

export function pushRevealStackTier(tier: RevealStackTier): boolean {
  if (activeStackTier && STACK_RANK[activeStackTier] > STACK_RANK[tier]) {
    return false;
  }
  activeStackTier = tier;
  return true;
}

export function popRevealStackTier(tier: RevealStackTier): void {
  if (activeStackTier === tier) activeStackTier = null;
}

export function isRevealStackBlocked(tier: RevealStackTier): boolean {
  return activeStackTier != null && STACK_RANK[activeStackTier] > STACK_RANK[tier];
}

export function getActiveRevealStackTier(): RevealStackTier | null {
  return activeStackTier;
}

export function hasOrderRevealBeenSeen(orderId: string): boolean {
  return seenOrderRevealIds.has(orderId);
}

export function markOrderRevealSeen(orderId: string): void {
  if (orderId) {
    seenOrderRevealIds.add(orderId);
    void persistSeenOrders();
  }
}

/** After payment succeeds, allow the reveal animation to run again for this order. */
export function prepareFreshRevealPlayback(orderId: string): void {
  if (!orderId) return;
  seenOrderRevealIds.delete(orderId);
  void persistSeenOrders();
  if (activeSession?.orderId === orderId) {
    activeSession = null;
    notifyActiveRevealListeners();
  }
  void clearRevealProgress(orderId);
}

export function resetOrderRevealSessionForTests(): void {
  seenOrderRevealIds.clear();
  activeSession = null;
  pendingPaymentBlocked = false;
  activeStackTier = null;
  foregroundSessionId = "test";
  backgroundIdleSince = null;
  activeRevealListeners.clear();
  resetRevealQueueForTests();
}

type PrefetchHandler = (orderId: string) => void;
let prefetchHandler: PrefetchHandler | null = null;

export function setRevealPrefetchHandler(handler: PrefetchHandler | null): void {
  prefetchHandler = handler;
}

export function maybePrefetchNextInQueue(currentOrderId: string, revealIndex: number, total: number): void {
  if (total <= 0 || revealIndex < total - 2) return;
  const next = peekRevealQueueHead();
  if (next && next.orderId !== currentOrderId) {
    prefetchHandler?.(next.orderId);
  }
}

export async function clearRevealSessionForUser(): Promise<void> {
  seenOrderRevealIds.clear();
  seenHydrated = true;
  await AsyncStorage.removeItem(SEEN_STORAGE_KEY);
  activeSession = null;
  pendingPaymentBlocked = false;
  activeStackTier = null;
  revealQueue.length = 0;
  queueListener?.(null);
  await clearRevealProgress();
}

export function setRevealPendingPaymentBlocked(blocked: boolean): void {
  pendingPaymentBlocked = blocked;
}

export function validateRevealPrizes(prizes: Product[]): boolean {
  return Array.isArray(prizes) && prizes.length > 0 && prizes.every((p) => !!p?.id);
}

export function tryAcquireAutoPlay(
  orderId: string,
  source: RevealSource,
  opts?: { pendingPayment?: boolean; prizes?: Product[] },
): AutoPlayResult {
  if (opts?.pendingPayment || pendingPaymentBlocked) {
    return "blocked_pending_payment";
  }
  if (opts?.prizes && !validateRevealPrizes(opts.prizes)) {
    return "blocked_invalid_prizes";
  }
  if (hasOrderRevealBeenSeen(orderId)) {
    return "blocked_seen";
  }
  if (activeSession && activeSession.orderId !== orderId) {
    return "blocked_by_active";
  }
  if (activeSession && activeSession.orderId === orderId && activeSession.source !== source) {
    return "blocked_by_active";
  }
  activeSession = { orderId, source, phase: "playing" };
  notifyActiveRevealListeners();
  return "allowed";
}

export function tryAcquireManualReplay(orderId: string, source: RevealSource): boolean {
  if (activeSession?.phase === "playing" && activeSession.orderId === orderId) {
    return false;
  }
  activeSession = { orderId, source, phase: "playing" };
  notifyActiveRevealListeners();
  return true;
}

export function getActiveRevealSession(): ActiveSession | null {
  return activeSession;
}

export function setRevealPhase(orderId: string, phase: RevealPhase): void {
  if (activeSession?.orderId === orderId) {
    activeSession = { ...activeSession, phase };
    notifyActiveRevealListeners();
  }
}

export function releaseRevealSession(
  orderId: string,
  reason: "complete" | "dismiss" | "interrupt" | "error",
): void {
  if (activeSession?.orderId === orderId) {
    activeSession = null;
    notifyActiveRevealListeners();
  }
  if (reason === "complete" || reason === "dismiss") {
    void clearRevealProgress(orderId);
    dequeueRevealTask(orderId);
  }
}

export function buildProgressSnapshot(
  partial: Omit<RevealProgressSnapshot, "updatedAt">,
): RevealProgressSnapshot {
  return { ...partial, updatedAt: Date.now() };
}

export async function persistRevealProgress(snapshot: RevealProgressSnapshot): Promise<void> {
  await saveRevealProgress(snapshot);
}

export async function restoreRevealProgress(orderId: string): Promise<RevealProgressSnapshot | null> {
  return loadRevealProgress(orderId);
}

export function handleModalForceClose(orderId: string): RevealResumeIntent {
  setRevealPhase(orderId, "interrupted");
  return "jump_to_summary";
}

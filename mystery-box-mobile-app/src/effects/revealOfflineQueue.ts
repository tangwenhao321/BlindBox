import AsyncStorage from "@react-native-async-storage/async-storage";
import { revealStorageKey } from "../utils/revealStorageNamespace";

const KEY = "offline_reveal_queue";

type QueueListener = (orderIds: string[]) => void;

let cachedQueue: string[] | null = null;
let loadPromise: Promise<string[]> | null = null;
const listeners = new Set<QueueListener>();

async function loadQueue(): Promise<string[]> {
  if (cachedQueue) return cachedQueue;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(revealStorageKey(KEY));
      cachedQueue = raw ? (JSON.parse(raw) as string[]) : [];
      return cachedQueue;
    } catch {
      cachedQueue = [];
      return cachedQueue;
    } finally {
      loadPromise = null;
    }
  })();
  return loadPromise;
}

async function persistQueue(queue: string[]): Promise<void> {
  cachedQueue = queue;
  await AsyncStorage.setItem(revealStorageKey(KEY), JSON.stringify(queue));
  listeners.forEach((fn) => fn([...queue]));
}

export function subscribeRevealQueue(listener: QueueListener): () => void {
  listeners.add(listener);
  void loadQueue().then((q) => listener([...q]));
  return () => listeners.delete(listener);
}

export async function enqueueRevealOrder(orderId: string): Promise<void> {
  const queue = await loadQueue();
  if (queue.includes(orderId)) return;
  await persistQueue([...queue, orderId]);
}

export async function flushRevealQueue(onResume: (orderId: string) => void | Promise<void>): Promise<number> {
  const queue = await loadQueue();
  if (!queue.length) return 0;
  let flushed = 0;
  for (const orderId of queue) {
    await onResume(orderId);
    flushed += 1;
  }
  await persistQueue([]);
  return flushed;
}

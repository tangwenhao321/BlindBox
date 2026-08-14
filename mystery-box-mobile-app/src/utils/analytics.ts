import AsyncStorage from "@react-native-async-storage/async-storage";
import type { TrackableEventName } from "./analyticsEvents";

const DEVICE_ID_KEY = "analytics_device_id_v1";
let cachedDeviceId: string | null = null;

type EventPayload = Record<string, string | number | boolean | undefined>;

export type EventItem = {
  name: string;
  payload: EventPayload;
  at: string;
};

const eventQueue: EventItem[] = [];
const STORAGE_KEY = "analytics_event_queue_v1";
let hydrated = false;
let lastUploadErrorAt = 0;

const uploadErrorListeners = new Set<(pending: number) => void>();

function notifyUploadListeners() {
  uploadErrorListeners.forEach((listener) => listener(eventQueue.length));
}

async function persistQueue() {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(eventQueue));
  } catch {
    // Ignore local cache write failures.
  }
}

export async function ensureAnalyticsDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;
  try {
    const saved = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (saved) {
      cachedDeviceId = saved;
      return saved;
    }
    const created = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    await AsyncStorage.setItem(DEVICE_ID_KEY, created);
    cachedDeviceId = created;
    return created;
  } catch {
    cachedDeviceId = `guest_ephemeral_${Date.now()}`;
    return cachedDeviceId;
  }
}

export function trackEvent(name: TrackableEventName, payload: EventPayload = {}) {
  void ensureAnalyticsDeviceId().then((deviceId) => {
    const event: EventItem = {
      name,
      payload: { ...payload, deviceId },
      at: new Date().toISOString(),
    };
    eventQueue.push(event);
    if (eventQueue.length > 200) {
      eventQueue.shift();
    }
    void persistQueue();
    if (__DEV__) {
      // eslint-disable-next-line no-console -- intentional diagnostics
      console.log("[track]", event.name, event.payload);
    }
  });
}

export function getRecentEvents(limit = 50) {
  return eventQueue.slice(-Math.max(1, limit));
}

export function drainEvents(limit = 50) {
  const size = Math.max(1, limit);
  const drained = eventQueue.splice(0, size);
  void persistQueue();
  return drained;
}

export function requeueEvents(items: EventItem[]) {
  if (!items.length) {
    return;
  }
  eventQueue.unshift(...items);
  if (eventQueue.length > 500) {
    eventQueue.splice(500);
  }
  void persistQueue();
  notifyUploadListeners();
}

export function getPendingAnalyticsCount() {
  return eventQueue.length;
}

export function markAnalyticsUploadError() {
  lastUploadErrorAt = Date.now();
  notifyUploadListeners();
}

export function shouldShowAnalyticsQueueHint() {
  return eventQueue.length >= 8 && Date.now() - lastUploadErrorAt < 5 * 60_000;
}

export function subscribeAnalyticsQueue(listener: (pending: number) => void) {
  uploadErrorListeners.add(listener);
  listener(eventQueue.length);
  return () => {
    uploadErrorListeners.delete(listener);
  };
}

export async function hydrateAnalyticsQueue() {
  if (hydrated) {
    return;
  }
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw) as EventItem[];
    if (!Array.isArray(parsed)) {
      return;
    }
    eventQueue.splice(0, eventQueue.length, ...parsed.filter((item) => item?.name));
  } catch {
    // Ignore malformed local cache payload.
  }
}

import { useEffect } from "react";

let lockDepth = 0;
const listeners = new Set<(locked: boolean) => void>();

function notify() {
  const locked = lockDepth > 0;
  listeners.forEach((fn) => fn(locked));
}

/** Block page swipe / back gestures while reveal animation is active. */
export function acquireRevealGestureLock(): () => void {
  lockDepth += 1;
  notify();
  return () => {
    lockDepth = Math.max(0, lockDepth - 1);
    notify();
  };
}

export function isRevealGestureLocked(): boolean {
  return lockDepth > 0;
}

export function subscribeRevealGestureLock(listener: (locked: boolean) => void): () => void {
  listeners.add(listener);
  listener(isRevealGestureLocked());
  return () => listeners.delete(listener);
}

export function useRevealGestureLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    return acquireRevealGestureLock();
  }, [active]);
}

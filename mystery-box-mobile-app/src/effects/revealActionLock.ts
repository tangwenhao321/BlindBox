import { getRevealRemoteConfig } from "./revealRemote";

let lockedUntil = 0;

export function lockRevealActions(ms?: number): void {
  const duration = ms ?? getRevealRemoteConfig().actionLockMs ?? 320;
  lockedUntil = Math.max(lockedUntil, Date.now() + duration);
}

export function isRevealActionLocked(): boolean {
  return Date.now() < lockedUntil;
}

export function withRevealActionLock<T extends (...args: never[]) => void>(
  fn: T,
  ms?: number,
): T {
  return ((...args: Parameters<T>) => {
    if (isRevealActionLocked()) return;
    lockRevealActions(ms);
    fn(...args);
  }) as T;
}

export function lockRevealEndZone(ms = 200): void {
  lockRevealActions(ms);
}

export function resetRevealActionLockForTests(): void {
  lockedUntil = 0;
}

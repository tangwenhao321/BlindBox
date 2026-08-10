export type RevealAnimPhase = "teaser" | "charge" | "flip" | "hold";

export type RevealInterruptSnapshot = {
  orderId: string;
  revealIndex: number;
  phase: RevealAnimPhase;
  progress: number;
  savedAt: number;
};

let cached: RevealInterruptSnapshot | null = null;

export function saveRevealInterruptSnapshot(snap: Omit<RevealInterruptSnapshot, "savedAt">): void {
  cached = { ...snap, savedAt: Date.now() };
}

export function loadRevealInterruptSnapshot(orderId?: string): RevealInterruptSnapshot | null {
  if (!cached) return null;
  if (orderId && cached.orderId !== orderId) return null;
  return cached;
}

export function clearRevealInterruptSnapshot(orderId?: string): void {
  if (!orderId || cached?.orderId === orderId) cached = null;
}

export function resetRevealInterruptSnapshotForTests(): void {
  cached = null;
}

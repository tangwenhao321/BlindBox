/** Sticky route context for fairness verify when opened from the order-result modal. */
export type FairnessRouteContext = {
  orderId: string;
  mysteryBoxId?: string;
};

let pending: FairnessRouteContext | null = null;
/** Survives verify back navigation while the order-result modal is still open. */
let sticky: FairnessRouteContext | null = null;

export function setPendingFairnessRoute(ctx: FairnessRouteContext): void {
  pending = ctx;
  sticky = ctx;
}

export function peekPendingFairnessRoute(): FairnessRouteContext | null {
  return pending ?? sticky;
}

/** Clears in-flight navigation context only (keeps sticky for return from verify). */
export function clearPendingFairnessRoute(): void {
  pending = null;
}

export function clearFairnessRouteSticky(): void {
  pending = null;
  sticky = null;
}

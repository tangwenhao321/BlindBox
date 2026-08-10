const activeOrderIds = new Set<string>();

export function enableTemporaryTurboForOrder(orderId: string): void {
  if (orderId) activeOrderIds.add(orderId);
}

export function disableTemporaryTurboForOrder(orderId: string): void {
  activeOrderIds.delete(orderId);
}

export function isTemporaryTurboActive(orderId?: string): boolean {
  return !!orderId && activeOrderIds.has(orderId);
}

export function temporaryTurboScale(orderId?: string): number {
  return isTemporaryTurboActive(orderId) ? 0.72 : 1;
}

export function resetTemporaryTurboForTests(): void {
  activeOrderIds.clear();
}

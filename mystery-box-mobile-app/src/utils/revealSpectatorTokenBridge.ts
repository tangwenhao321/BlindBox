let cachedOrderId: string | null = null;
let cachedToken: string | null = null;

export function setRevealSpectatorShareToken(orderId: string, token: string | null): void {
  cachedOrderId = orderId;
  cachedToken = token;
}

export function getRevealSpectatorShareToken(orderId: string): string | null {
  return cachedOrderId === orderId ? cachedToken : null;
}

export function clearRevealSpectatorShareToken(orderId?: string): void {
  if (!orderId || cachedOrderId === orderId) {
    cachedOrderId = null;
    cachedToken = null;
  }
}

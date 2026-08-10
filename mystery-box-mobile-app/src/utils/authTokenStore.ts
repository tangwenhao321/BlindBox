/** In-memory session token; persisted only via SecureStore (see useAuth). */
let sessionToken = "";
const listeners = new Set<() => void>();

function notifyTokenListeners() {
  listeners.forEach((listener) => listener());
}

export function subscribeSessionAuthToken(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setSessionAuthToken(token: string) {
  if (sessionToken === token) return;
  sessionToken = token;
  notifyTokenListeners();
}

export function getSessionAuthToken(): string {
  return sessionToken;
}

export function clearSessionAuthToken() {
  if (!sessionToken) return;
  sessionToken = "";
  notifyTokenListeners();
}

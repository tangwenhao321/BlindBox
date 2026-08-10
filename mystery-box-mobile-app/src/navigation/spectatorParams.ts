let pendingToken: string | null = null;

export function setSpectatorToken(token: string) {
  pendingToken = token;
}

export function peekSpectatorToken(): string | null {
  return pendingToken;
}

export function clearSpectatorToken() {
  pendingToken = null;
}

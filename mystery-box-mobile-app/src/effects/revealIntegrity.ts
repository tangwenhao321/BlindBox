const INTEGRITY_SALT = "reveal_integrity_v1";

function djb2Hash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36);
}

function serializePayload(data: unknown): string {
  return JSON.stringify(data);
}

export function signRevealPayload(data: unknown): string {
  const body = serializePayload(data);
  return djb2Hash(`${INTEGRITY_SALT}:${body}`);
}

export function verifyRevealPayload(data: unknown, sig: string): boolean {
  if (!sig) return false;
  return signRevealPayload(data) === sig;
}

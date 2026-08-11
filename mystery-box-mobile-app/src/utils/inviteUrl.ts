/** Build shareable invite URL (HTTPS when configured, else custom scheme). */

export function buildInviteSchemeUrl(inviteCode: string): string {
  const code = inviteCode.trim();
  return `mysterybox://invite?invite=${encodeURIComponent(code)}`;
}

export function buildInviteUrl(inviteCode: string): string {
  const code = inviteCode.trim();
  const base = process.env.EXPO_PUBLIC_INVITE_BASE_URL?.trim().replace(/\/$/, "");
  if (base) {
    return `${base}/invite/${encodeURIComponent(code)}`;
  }
  return buildInviteSchemeUrl(code);
}

/** Primary + always-included scheme deep link for share messages. */
export function buildInviteShareTextLinks(inviteCode: string): { primary: string; scheme: string } {
  const scheme = buildInviteSchemeUrl(inviteCode);
  const primary = buildInviteUrl(inviteCode);
  return { primary, scheme };
}

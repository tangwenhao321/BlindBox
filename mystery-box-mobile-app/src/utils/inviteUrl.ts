/** Build shareable invite URL (HTTPS when configured, else custom scheme). */

export function buildInviteUrl(inviteCode: string): string {
  const code = inviteCode.trim();
  const base = process.env.EXPO_PUBLIC_INVITE_BASE_URL?.trim().replace(/\/$/, "");
  if (base) {
    return `${base}/invite/${encodeURIComponent(code)}`;
  }
  return `mysterybox://invite?invite=${encodeURIComponent(code)}`;
}

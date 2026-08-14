/** Build shareable invite URL (HTTPS when configured, else custom scheme). */

export function buildInviteSchemeUrl(inviteCode: string): string {
  const code = inviteCode.trim();
  return `mysterybox://invite?invite=${encodeURIComponent(code)}`;
}

function normalizeInviteBase(raw: string): string {
  return raw.trim().replace(/\/$/, "").replace(/\/invite$/i, "");
}

export function buildInviteUrl(inviteCode: string): string {
  const code = inviteCode.trim();
  const inviteBase = process.env.EXPO_PUBLIC_INVITE_BASE_URL?.trim();
  if (inviteBase) {
    return `${normalizeInviteBase(inviteBase)}/invite/${encodeURIComponent(code)}`;
  }
  const linkDomain = (process.env.EXPO_PUBLIC_APP_LINK_DOMAIN || "").trim().replace(/^https?:\/\//i, "").replace(/\/$/, "");
  if (linkDomain) {
    return `https://${linkDomain}/invite/${encodeURIComponent(code)}`;
  }
  return buildInviteSchemeUrl(code);
}

/** Primary + always-included scheme deep link for share messages. */
export function buildInviteShareTextLinks(inviteCode: string): { primary: string; scheme: string } {
  const scheme = buildInviteSchemeUrl(inviteCode);
  const primary = buildInviteUrl(inviteCode);
  return { primary, scheme };
}

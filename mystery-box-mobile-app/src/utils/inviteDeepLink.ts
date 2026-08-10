/** Parse invite code from universal link or custom scheme (no native deps — vitest-safe). */

function queryParams(url: string): Record<string, string> {
  const queryIndex = url.indexOf("?");
  if (queryIndex < 0) return {};
  const params = new URLSearchParams(url.slice(queryIndex + 1));
  const out: Record<string, string> = {};
  params.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function pathSegment(url: string): string {
  try {
    const normalized = url.replace(/^mysterybox:\/\//i, "https://mysterybox.app/");
    const parsed = new URL(normalized);
    return parsed.pathname.replace(/^\//, "");
  } catch {
    const withoutScheme = url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
    return withoutScheme.split("?")[0]?.replace(/^\//, "") ?? "";
  }
}

export function parseInviteCodeFromUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  const params = queryParams(trimmed);
  const fromQuery = params.invite ?? params.code ?? params.inviteCode;
  if (fromQuery?.trim()) {
    return fromQuery.trim();
  }
  const path = pathSegment(trimmed);
  if (path.startsWith("invite/")) {
    const segment = path.slice("invite/".length).split("/")[0];
    if (segment?.trim()) return segment.trim();
  }
  return null;
}

import type { NotificationDeepLink } from "./notificationDeepLink";
import { resolveDeepLinkFromAppPath } from "../navigation/routeRegistry";

function pathSegment(url: string): { path: string; query: string } {
  try {
    const normalized = url.replace(/^mysterybox:\/\//i, "https://mysterybox.app/");
    const parsed = new URL(normalized);
    return {
      path: parsed.pathname.replace(/^\//, ""),
      query: parsed.search.replace(/^\?/, ""),
    };
  } catch {
    const withoutScheme = url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
    const [pathPart, queryPart = ""] = withoutScheme.split("?");
    return { path: pathPart.replace(/^\//, ""), query: queryPart };
  }
}

/** Universal / custom-scheme paths like /order/{id}, /orders, /messages. */
export function parseAppPathDeepLink(url: string | null | undefined): NotificationDeepLink | null {
  if (!url?.trim()) return null;
  const { path, query } = pathSegment(url.trim());
  if (!path) return null;
  const merged = query ? `${path}?${query}` : path;
  return resolveDeepLinkFromAppPath(merged);
}

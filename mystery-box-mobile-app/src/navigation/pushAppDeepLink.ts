import { router } from "expo-router";
import { parseAppPathDeepLink } from "../utils/appPathDeepLink";
import type { NotificationDeepLink } from "../utils/notificationDeepLink";
import { appPathToHref, deepLinkToHref } from "./appViewRoutes";

/** Navigate via expo-router. Returns true if handled. */
export function pushAppDeepLink(link: NotificationDeepLink): boolean {
  router.push(deepLinkToHref(link) as never);
  return true;
}

/** Navigate to a universal/custom-scheme URL. */
export function pushAppPathDeepLinkFromUrl(url: string | null | undefined): boolean {
  const link = parseAppPathDeepLink(url);
  if (!link) return false;
  return pushAppDeepLink(link);
}

/** Push a universal/custom-scheme path resolved by appPathDeepLink. */
export function pushAppPathDeepLink(path: string): boolean {
  const href = appPathToHref(path);
  if (!href) return false;
  router.push(href as never);
  return true;
}

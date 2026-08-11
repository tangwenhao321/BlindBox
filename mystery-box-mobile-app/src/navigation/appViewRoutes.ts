import type { AppView } from "../components/mainTabs/appViews";
import { isTabAppView, TAB_APP_VIEWS } from "../components/mainTabs/appViews";
import { getRoutePath, listRegisteredRoutes, resolveDeepLinkFromAppPath } from "./routeRegistry";
import type { NotificationDeepLink } from "../utils/notificationDeepLink";

export { isTabAppView, TAB_APP_VIEWS };

/** Expo Router href for a view (and optional entity id). */
export function appViewToHref(
  view: AppView,
  params?: {
    orderId?: string;
    boxId?: string;
    paymentResponseCode?: string;
    spectatorToken?: string;
    listingId?: string;
    listingTitle?: string;
  },
): string {
  if (isTabAppView(view)) {
    return `/(shell)/(tabs)/${view}`;
  }
  if (view === "paymentReturn" && params?.orderId) {
    const query = new URLSearchParams({ orderId: params.orderId });
    if (params.paymentResponseCode) {
      query.set("vnp_ResponseCode", params.paymentResponseCode);
    }
    return `/payment-return?${query.toString()}`;
  }
  if (view === "marketplaceChat" && params?.listingId) {
    const query = new URLSearchParams({ listingId: params.listingId });
    if (params.listingTitle) {
      query.set("title", params.listingTitle);
    }
    return `/marketplace-chat?${query.toString()}`;
  }
  if (view === "revealSpectator" && params?.spectatorToken) {
    return `/reveal/spectator/${encodeURIComponent(params.spectatorToken)}`;
  }
  if (view === "orderDetails") {
    if (params?.orderId) {
      return `/order/${encodeURIComponent(params.orderId)}`;
    }
    return "/orders";
  }
  if (view === "boxDetails") {
    if (params?.boxId) {
      return `/box/${encodeURIComponent(params.boxId)}`;
    }
    return "/(shell)/(tabs)/home";
  }
  const segment = getRoutePath(view);
  if (!segment) {
    throw new Error(`No route path registered for AppView: ${view}`);
  }
  return `/${segment}`;
}

/** Build router href from a parsed deep link. */
export function deepLinkToHref(link: NotificationDeepLink): string {
  return appViewToHref(link.view, {
    orderId: link.orderId,
    boxId: link.boxId,
    paymentResponseCode: link.paymentResponseCode,
    spectatorToken: link.spectatorToken,
    listingId: link.listingId,
    listingTitle: link.listingTitle,
  });
}

/** Map an app URL path segment (from appPathDeepLink) to an Expo Router href. */
export function appPathToHref(path: string): string | null {
  const trimmed = path.trim().replace(/^\//, "");
  if (!trimmed) return null;
  const link = resolveDeepLinkFromAppPath(trimmed);
  return link ? deepLinkToHref(link) : null;
}

/** All AppView values that have a registered stack or tab route. */
export function listRoutableAppViews(): AppView[] {
  const views = new Set<AppView>([...TAB_APP_VIEWS]);
  for (const entry of listRegisteredRoutes()) {
    views.add(entry.view);
  }
  return [...views];
}

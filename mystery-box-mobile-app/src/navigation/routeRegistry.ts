import type { AppView } from "../components/mainTabs/appViews";
import type { NotificationDeepLink } from "../utils/notificationDeepLink";

export type PushCategory =
  | "ORDER"
  | "PENDING_PAY"
  | "WAREHOUSE_SHIP"
  | "REFUND"
  | "MARKETPLACE"
  | "COUPON"
  | "COMMUNITY"
  | "WELFARE"
  | "MESSAGES"
  | "RESTOCK"
  | "PITY"
  | "APP_UPDATE";

export type RouteRegistryEntry = {
  view: AppView;
  /** URL path segment (no leading slash), e.g. `orders` or `order/{id}`. */
  path?: string;
  /** Push notification category resolved to this view. */
  pushCategory?: PushCategory;
  /** Whether `refId` from push maps to `orderId` on the deep link. */
  pushRefAsOrderId?: boolean;
  /** Whether `refId` from push maps to `boxId` on the deep link. */
  pushRefAsBoxId?: boolean;
  /** Whether `refId` from push maps to `shipRequestId`. */
  pushRefAsShipRequestId?: boolean;
};

const ROUTES: RouteRegistryEntry[] = [
  { view: "home", path: "home" },
  { view: "mall", path: "mall" },
  { view: "warehouse", path: "warehouse", pushCategory: "WAREHOUSE_SHIP", pushRefAsShipRequestId: true },
  { view: "profile", path: "profile" },
  { view: "orders", path: "orders" },
  { view: "messages", path: "messages", pushCategory: "MESSAGES" },
  { view: "marketplace", path: "marketplace", pushCategory: "MARKETPLACE" },
  { view: "refunds", path: "refunds", pushCategory: "REFUND" },
  { view: "coupons", path: "coupons", pushCategory: "COUPON" },
  { view: "favorites", path: "favorites" },
  { view: "welfare", path: "welfare", pushCategory: "WELFARE" },
  { view: "shipRequests", path: "ship-requests", pushCategory: "WAREHOUSE_SHIP", pushRefAsShipRequestId: true },
  { view: "exchangeMall", path: "exchange-mall" },
  { view: "orderDetails", path: "order", pushCategory: "ORDER", pushRefAsOrderId: true },
  { view: "boxDetails", path: "box" },
  { view: "settings", path: "settings" },
  { view: "leaderboard", path: "leaderboard" },
  { view: "fairnessVerify", path: "fairness" },
  { view: "community", path: "community", pushCategory: "COMMUNITY" },
  { view: "balanceLogs", path: "balance-logs" },
  { view: "addressManage", path: "addresses" },
  { view: "addressForm", path: "address-form" },
  { view: "feedback", path: "feedback" },
  { view: "promotion", path: "promotion" },
  { view: "commission", path: "commission" },
  { view: "team", path: "team" },
  { view: "luckyCoins", path: "lucky-coins" },
  { view: "starStones", path: "star-stones" },
  { view: "privacy", path: "privacy" },
  { view: "termsOfService", path: "terms-of-service" },
  { view: "minorDeclaration", path: "minor-declaration" },
  { view: "levelGift", path: "level-gift" },
  { view: "inviteCenter", path: "invite" },
  { view: "ipTheme", path: "ip-theme" },
  { view: "probability", path: "probability" },
  { view: "activityDetail", path: "activity" },
  { view: "catalogSearch", path: "search" },
  { view: "playGuide", path: "play-guide" },
  { view: "paymentReturn", path: "payment-return" },
  { view: "revealSpectator", path: "reveal/spectator" },
];

const ORDER_DETAIL_PUSH: RouteRegistryEntry = {
  view: "orderDetails",
  pushCategory: "PENDING_PAY",
  pushRefAsOrderId: true,
};

const pathByView = new Map<AppView, string>();
const viewByPath = new Map<string, AppView>();
const pushByCategory = new Map<PushCategory, RouteRegistryEntry>();

for (const entry of ROUTES) {
  if (entry.path) {
    pathByView.set(entry.view, entry.path);
    viewByPath.set(entry.path, entry.view);
  }
  if (entry.pushCategory) {
    pushByCategory.set(entry.pushCategory, entry);
  }
}
pushByCategory.set("PENDING_PAY", ORDER_DETAIL_PUSH);

export function getRoutePath(view: AppView): string | undefined {
  return pathByView.get(view);
}

export function resolveViewFromPathSegment(segment: string): AppView | null {
  return viewByPath.get(segment) ?? null;
}

export function resolveDeepLinkFromPush(
  category?: string | null,
  refId?: string | null,
): NotificationDeepLink | null {
  if (!category) return null;
  const entry = pushByCategory.get(category as PushCategory);
  if (!entry) return null;
  const link: NotificationDeepLink = { view: entry.view };
  if (entry.pushRefAsOrderId && refId) link.orderId = refId;
  if (entry.pushRefAsBoxId && refId) link.boxId = refId;
  if (entry.pushRefAsShipRequestId && refId) link.shipRequestId = refId;
  if (entry.view === "refunds" || entry.view === "marketplace" || entry.view === "coupons" || entry.view === "community" || entry.view === "welfare") {
    return link;
  }
  if (entry.pushRefAsOrderId && !refId) return null;
  if (entry.pushRefAsShipRequestId && category === "WAREHOUSE_SHIP" && !refId) return null;
  return link;
}

export function resolveDeepLinkFromAppPath(path: string): NotificationDeepLink | null {
  const trimmed = path.trim().replace(/^\//, "");
  if (!trimmed) return null;

  if (trimmed.startsWith("invite/")) {
    return null;
  }

  if (trimmed.startsWith("payment-return")) {
    const query = trimmed.includes("?") ? trimmed.split("?")[1] : "";
    const params = new URLSearchParams(query);
    const orderId = params.get("orderId")?.trim() || params.get("vnp_TxnRef")?.trim();
    if (!orderId) return null;
    return {
      view: "paymentReturn",
      orderId,
      paymentResponseCode: params.get("vnp_ResponseCode") ?? undefined,
    };
  }

  if (trimmed.startsWith("order/")) {
    const orderId = trimmed.slice("order/".length).split("/")[0]?.trim();
    if (orderId) return { view: "orderDetails", orderId };
    return null;
  }

  if (trimmed.startsWith("box/")) {
    const boxId = trimmed.slice("box/".length).split("/")[0]?.trim();
    if (boxId) return { view: "boxDetails", boxId };
    return null;
  }

  if (trimmed.startsWith("reveal/spectator/")) {
    const token = trimmed.slice("reveal/spectator/".length).split("/")[0]?.trim();
    if (token) return { view: "revealSpectator", spectatorToken: token };
    return null;
  }

  const segment = trimmed.split("/")[0];
  const view = resolveViewFromPathSegment(segment);
  return view ? { view } : null;
}

export function listRegisteredRoutes(): readonly RouteRegistryEntry[] {
  return ROUTES;
}

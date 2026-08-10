import type { TabKey } from "../ui/BottomTabBar";
import { listRegisteredRoutes } from "../../navigation/routeRegistry";
import { isTabAppView, type AppView } from "./appViews";

/** Sub-pages registered in routeRegistry excluding bottom tabs. */
export const MAIN_TABS_SUB_PAGES: AppView[] = listRegisteredRoutes()
  .map((entry) => entry.view)
  .filter((view) => !isTabAppView(view));

const SUB_PAGE_TAB_HINT: Partial<Record<AppView, TabKey>> = {
  orders: "profile",
  promotion: "profile",
  commission: "profile",
  team: "profile",
  favorites: "profile",
  welfare: "profile",
  coupons: "profile",
  luckyCoins: "profile",
  starStones: "profile",
  privacy: "profile",
  levelGift: "profile",
  inviteCenter: "profile",
  ipTheme: "home",
  addressManage: "profile",
  addressForm: "profile",
  messages: "profile",
  feedback: "profile",
  settings: "profile",
  balanceLogs: "profile",
  boxDetails: "home",
  probability: "home",
  leaderboard: "home",
  exchangeMall: "profile",
  activityDetail: "home",
  catalogSearch: "mall",
  playGuide: "home",
  orderDetails: "profile",
  marketplace: "warehouse",
  shipRequests: "warehouse",
  community: "profile",
  refunds: "profile",
  fairnessVerify: "profile",
  paymentReturn: "home",
};

export function isMainTabsSubPage(view: AppView): boolean {
  return MAIN_TABS_SUB_PAGES.includes(view);
}

export function resolveMainTabsActiveTab(view: AppView): TabKey {
  if (!isMainTabsSubPage(view)) return view as TabKey;
  if (view === "catalogSearch") return "mall";
  return SUB_PAGE_TAB_HINT[view] ?? "home";
}

export function computeProfileTabBadge(
  unreadMessageCount: number,
  orderBadges: { pendingPay: number; pendingDelivery: number; pendingReceive: number },
): number {
  const orderActionBadge = orderBadges.pendingPay + orderBadges.pendingDelivery + orderBadges.pendingReceive;
  return Math.max(unreadMessageCount, orderActionBadge);
}

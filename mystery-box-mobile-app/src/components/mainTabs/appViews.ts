import type { TabKey } from "../ui/BottomTabBar";

/** Bottom-tab views shared by Expo Router tabs and legacy MainTabs navigation. */
export const TAB_APP_VIEWS = ["home", "mall", "warehouse", "profile"] as const satisfies readonly TabKey[];

export type TabAppView = (typeof TAB_APP_VIEWS)[number];

export function isTabAppView(view: AppView): view is TabKey {
  return (TAB_APP_VIEWS as readonly string[]).includes(view);
}

export type AppView =
  | TabKey
  | "orders"
  | "balanceLogs"
  | "boxDetails"
  | "orderDetails"
  | "addressManage"
  | "addressForm"
  | "messages"
  | "feedback"
  | "settings"
  | "promotion"
  | "commission"
  | "team"
  | "favorites"
  | "coupons"
  | "welfare"
  | "luckyCoins"
  | "starStones"
  | "privacy"
  | "termsOfService"
  | "minorDeclaration"
  | "levelGift"
  | "inviteCenter"
  | "ipTheme"
  | "effectsCenter"
  | "probability"
  | "exchangeMall"
  | "leaderboard"
  | "community"
  | "activityDetail"
  | "marketplace"
  | "marketplaceChat"
  | "teamLottery"
  | "refunds"
  | "shipRequests"
  | "fairnessVerify"
  | "catalogSearch"
  | "playGuide"
  | "paymentReturn"
  | "revealSpectator";

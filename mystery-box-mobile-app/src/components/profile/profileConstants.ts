import type { ComponentProps } from "react";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ORDER_STATUS } from "../../config/constants";
import { FEATURE_KEYS, type FeatureKey } from "../../config/featureRegistry";
import { spacing } from "../../styles/tokens";

export type VectorIconName =
  | ComponentProps<typeof Ionicons>["name"]
  | ComponentProps<typeof MaterialCommunityIcons>["name"];

export type PrimaryTool = {
  key: string;
  labelKey: string;
  iconSet: "ion" | "mci";
  icon: VectorIconName;
  action: "orders" | "warehouse" | "wallet" | "settings";
};

export const PRIMARY_TOOLS: PrimaryTool[] = [
  { key: "orders", labelKey: "profile.toolOrders", iconSet: "ion", icon: "receipt-outline", action: "orders" },
  { key: "warehouse", labelKey: "profile.toolWarehouse", iconSet: "mci", icon: "archive-outline", action: "warehouse" },
  { key: "wallet", labelKey: "profile.toolCouponsWallet", iconSet: "ion", icon: "wallet-outline", action: "wallet" },
  { key: "settings", labelKey: "profile.toolSettings", iconSet: "ion", icon: "settings-outline", action: "settings" },
];

export const ORDER_SHORTCUTS = [
  { key: "all", labelKey: "profile.orderAll", icon: "list-outline" as const, status: "ALL" },
  { key: "pay", labelKey: "profile.orderToPay", icon: "card-outline" as const, status: ORDER_STATUS.TO_BE_PAID },
  { key: "ship", labelKey: "profile.orderToShip", icon: "cube-outline" as const, status: ORDER_STATUS.TO_BE_DELIVERED },
  { key: "recv", labelKey: "profile.orderToReceive", icon: "boat-outline" as const, status: ORDER_STATUS.TO_BE_RECEIVED },
  { key: "done", labelKey: "profile.orderFinished", icon: "checkmark-circle-outline" as const, status: ORDER_STATUS.FINISHED },
] as const;

export type MoreGridItem =
  | { labelKey: string; featureKey: FeatureKey; iconSet: "ion" | "mci"; icon: VectorIconName }
  | { labelKey: string; action: "address" | "feedback" | "invite"; iconSet: "ion" | "mci"; icon: VectorIconName };

export type GuidedFeatureSectionId = "newcomer" | "draw" | "warehouse" | "secondary";

export type GuidedFeatureSection = {
  id: GuidedFeatureSectionId;
  titleKey: string;
  items: MoreGridItem[];
};

/** Guided journey: newcomer → draw → warehouse → secondary. Features kept, order clarified. */
export const FEATURE_SECTIONS: GuidedFeatureSection[] = [
  {
    id: "newcomer",
    titleKey: "profile.sectionNewcomer",
    items: [
      { labelKey: "profile.appCheckIn", featureKey: FEATURE_KEYS.CHECK_IN, iconSet: "ion", icon: "calendar-outline" },
      { labelKey: "profile.appCoupons", featureKey: FEATURE_KEYS.COUPONS, iconSet: "ion", icon: "ticket-outline" },
      { labelKey: "profile.appVip", featureKey: FEATURE_KEYS.VIP, iconSet: "ion", icon: "diamond-outline" },
      { labelKey: "profile.appStarStones", featureKey: FEATURE_KEYS.STAR_STONES, iconSet: "ion", icon: "sparkles" },
      { labelKey: "profile.toolInvite", action: "invite", iconSet: "ion", icon: "people-outline" },
    ],
  },
  {
    id: "draw",
    titleKey: "profile.sectionDraw",
    items: [
      { labelKey: "profile.appFavorites", featureKey: FEATURE_KEYS.FAVORITES, iconSet: "ion", icon: "heart-outline" },
      { labelKey: "profile.appCommunity", featureKey: FEATURE_KEYS.COMMUNITY, iconSet: "ion", icon: "chatbubble-ellipses-outline" },
      { labelKey: "profile.appLeaderboard", featureKey: FEATURE_KEYS.LEADERBOARD, iconSet: "ion", icon: "trophy-outline" },
      { labelKey: "profile.appIpTheme", featureKey: FEATURE_KEYS.IP_THEME, iconSet: "ion", icon: "color-palette-outline" },
      { labelKey: "profile.appTeamLottery", featureKey: FEATURE_KEYS.TEAM_LOTTERY, iconSet: "ion", icon: "dice-outline" },
      { labelKey: "profile.appEffectsCenter", featureKey: FEATURE_KEYS.EFFECTS_CENTER, iconSet: "ion", icon: "sparkles-outline" },
      { labelKey: "profile.appInviteCenter", featureKey: FEATURE_KEYS.INVITE_CENTER, iconSet: "ion", icon: "share-social-outline" },
    ],
  },
  {
    id: "warehouse",
    titleKey: "profile.sectionWarehouse",
    items: [
      { labelKey: "profile.appAddress", action: "address", iconSet: "ion", icon: "location-outline" },
      { labelKey: "profile.appMarketplace", featureKey: FEATURE_KEYS.MARKETPLACE, iconSet: "mci", icon: "storefront-outline" },
      { labelKey: "profile.appExchangeMall", featureKey: FEATURE_KEYS.EXCHANGE_MALL, iconSet: "ion", icon: "swap-horizontal-outline" },
      { labelKey: "profile.appRefunds", featureKey: FEATURE_KEYS.REFUNDS, iconSet: "ion", icon: "return-down-back-outline" },
    ],
  },
  {
    id: "secondary",
    titleKey: "profile.sectionSecondary",
    items: [
      { labelKey: "profile.appSupport", featureKey: FEATURE_KEYS.CONTACT_SUPPORT, iconSet: "ion", icon: "chatbubbles-outline" },
      { labelKey: "profile.appWecom", featureKey: FEATURE_KEYS.ENTERPRISE_WECHAT, iconSet: "mci", icon: "wechat" },
      { labelKey: "profile.appFeedback", action: "feedback", iconSet: "ion", icon: "create-outline" },
    ],
  },
];

/** Flat list for filtering / locale visibility (same items as FEATURE_SECTIONS). */
export const MORE_GRID: MoreGridItem[] = FEATURE_SECTIONS.flatMap((section) => section.items);

export const APP_GRID_COLUMNS = 4;

export function resolveAppGridCellWidth(gridWidth: number): number {
  const gap = spacing.xs;
  return Math.max(0, Math.floor((gridWidth - gap * (APP_GRID_COLUMNS - 1)) / APP_GRID_COLUMNS));
}

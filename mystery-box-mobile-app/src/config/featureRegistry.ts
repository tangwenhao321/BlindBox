import type { AppView } from "../components/mainTabs/appViews";
import { getAppLocale, type AppLocale } from "../utils/i18nLocale";

export type FeatureRoute =
  | { type: "view"; view: AppView }
  | { type: "action"; action: "shareInvite" | "contactSupport" | "enterpriseWechat" };

/** Stable routing slugs — display labels use i18n. */
export const FEATURE_KEYS = {
  PROMOTION: "promotion",
  TEAM: "team",
  TEAM_LOTTERY: "teamLottery",
  COMMISSION: "commission",
  INVITE_FRIENDS: "inviteFriends",
  INVITE_REWARD: "inviteReward",
  INVITE_BONUS: "inviteBonus",
  CHECK_IN: "checkIn",
  COUPONS: "coupons",
  WELFARE: "welfare",
  FAVORITES: "favorites",
  LUCKY_COINS: "luckyCoins",
  STAR_STONES: "starStones",
  CONTACT_SUPPORT: "contactSupport",
  ENTERPRISE_WECHAT: "enterpriseWechat",
  PRIVACY: "privacy",
  LEVEL_GIFT: "levelGift",
  VIP: "vip",
  INVITE_CENTER: "inviteCenter",
  IP_THEME: "ipTheme",
  EFFECTS_CENTER: "effectsCenter",
  EXCHANGE_MALL: "exchangeMall",
  LEADERBOARD: "leaderboard",
  COMMUNITY: "community",
  MARKETPLACE: "marketplace",
  REFUNDS: "refunds",
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];

const ROUTES: Record<FeatureKey, FeatureRoute> = {
  [FEATURE_KEYS.PROMOTION]: { type: "view", view: "promotion" },
  [FEATURE_KEYS.TEAM]: { type: "view", view: "team" },
  [FEATURE_KEYS.TEAM_LOTTERY]: { type: "view", view: "teamLottery" },
  [FEATURE_KEYS.COMMISSION]: { type: "view", view: "commission" },
  [FEATURE_KEYS.INVITE_FRIENDS]: { type: "action", action: "shareInvite" },
  [FEATURE_KEYS.INVITE_REWARD]: { type: "action", action: "shareInvite" },
  [FEATURE_KEYS.INVITE_BONUS]: { type: "action", action: "shareInvite" },
  [FEATURE_KEYS.CHECK_IN]: { type: "view", view: "welfare" },
  [FEATURE_KEYS.COUPONS]: { type: "view", view: "coupons" },
  [FEATURE_KEYS.WELFARE]: { type: "view", view: "welfare" },
  [FEATURE_KEYS.FAVORITES]: { type: "view", view: "favorites" },
  [FEATURE_KEYS.LUCKY_COINS]: { type: "view", view: "luckyCoins" },
  [FEATURE_KEYS.STAR_STONES]: { type: "view", view: "starStones" },
  [FEATURE_KEYS.CONTACT_SUPPORT]: { type: "action", action: "contactSupport" },
  [FEATURE_KEYS.ENTERPRISE_WECHAT]: { type: "action", action: "enterpriseWechat" },
  [FEATURE_KEYS.PRIVACY]: { type: "view", view: "privacy" },
  [FEATURE_KEYS.LEVEL_GIFT]: { type: "view", view: "levelGift" },
  [FEATURE_KEYS.VIP]: { type: "view", view: "levelGift" },
  [FEATURE_KEYS.INVITE_CENTER]: { type: "view", view: "inviteCenter" },
  [FEATURE_KEYS.IP_THEME]: { type: "view", view: "ipTheme" },
  [FEATURE_KEYS.EFFECTS_CENTER]: { type: "view", view: "effectsCenter" },
  [FEATURE_KEYS.EXCHANGE_MALL]: { type: "view", view: "exchangeMall" },
  [FEATURE_KEYS.LEADERBOARD]: { type: "view", view: "leaderboard" },
  [FEATURE_KEYS.COMMUNITY]: { type: "view", view: "community" },
  [FEATURE_KEYS.MARKETPLACE]: { type: "view", view: "marketplace" },
  [FEATURE_KEYS.REFUNDS]: { type: "view", view: "refunds" },
};

/** Legacy Chinese titles from CMS / deep links. */
const LEGACY_FEATURE_ALIASES: Record<string, FeatureKey> = {
  我的推广: FEATURE_KEYS.PROMOTION,
  团队管理: FEATURE_KEYS.TEAM,
  对对碰: FEATURE_KEYS.TEAM_LOTTERY,
  佣金明细: FEATURE_KEYS.COMMISSION,
  邀请好友: FEATURE_KEYS.INVITE_FRIENDS,
  邀请有礼: FEATURE_KEYS.INVITE_REWARD,
  邀请有奖: FEATURE_KEYS.INVITE_BONUS,
  签到有奖: FEATURE_KEYS.CHECK_IN,
  优惠券: FEATURE_KEYS.COUPONS,
  福利中心: FEATURE_KEYS.WELFARE,
  我的收藏: FEATURE_KEYS.FAVORITES,
  幸运币: FEATURE_KEYS.LUCKY_COINS,
  星石: FEATURE_KEYS.STAR_STONES,
  联系客服: FEATURE_KEYS.CONTACT_SUPPORT,
  企业微信: FEATURE_KEYS.ENTERPRISE_WECHAT,
  隐私与使用说明: FEATURE_KEYS.PRIVACY,
  等级礼包: FEATURE_KEYS.LEVEL_GIFT,
  会员权益: FEATURE_KEYS.VIP,
  邀请中心: FEATURE_KEYS.INVITE_CENTER,
  IP专题馆: FEATURE_KEYS.IP_THEME,
  特效中心: FEATURE_KEYS.EFFECTS_CENTER,
  进阶商城: FEATURE_KEYS.EXCHANGE_MALL,
  欧皇榜: FEATURE_KEYS.LEADERBOARD,
  晒单墙: FEATURE_KEYS.COMMUNITY,
  赏品集市: FEATURE_KEYS.MARKETPLACE,
  退款记录: FEATURE_KEYS.REFUNDS,
};

function resolveFeatureKey(title: string): FeatureKey | null {
  if (title in ROUTES) return title as FeatureKey;
  if (LEGACY_FEATURE_ALIASES[title]) return LEGACY_FEATURE_ALIASES[title];
  if (title.includes("优惠券")) return FEATURE_KEYS.COUPONS;
  if (title.includes("邀请")) return FEATURE_KEYS.INVITE_FRIENDS;
  if (title.includes("佣金")) return FEATURE_KEYS.COMMISSION;
  if (title.includes("联系客服")) return FEATURE_KEYS.CONTACT_SUPPORT;
  if (title.includes("隐私")) return FEATURE_KEYS.PRIVACY;
  return null;
}

export function resolveFeatureRoute(title: string): FeatureRoute | null {
  const key = resolveFeatureKey(title);
  return key ? ROUTES[key] : null;
}

export function isFeatureVisibleForLocale(
  key: FeatureKey,
  locale: AppLocale = getAppLocale(),
  featureFlags?: Record<string, boolean>,
) {
  if (locale === "vi-VN" && key === FEATURE_KEYS.ENTERPRISE_WECHAT) return false;
  if (key === FEATURE_KEYS.COMMUNITY && featureFlags && featureFlags["mobile.community.enabled"] === false) {
    return false;
  }
  if (key === FEATURE_KEYS.MARKETPLACE && featureFlags && featureFlags["mobile.marketplace.enabled"] === false) {
    return false;
  }
  if (key === FEATURE_KEYS.WELFARE && featureFlags && featureFlags["mobile.welfare.enabled"] === false) {
    return false;
  }
  return true;
}

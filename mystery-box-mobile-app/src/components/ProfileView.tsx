import { useCallback, useEffect, useMemo, useState, type ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { parseError } from "../api";
import { fetchLeaderboardMe } from "../services/leaderboardService";
import { getCheckInStatus } from "../services/welfareService";
import { useReferralStats } from "../hooks/useReferralStats";
import { useAuthToken } from "../hooks/useAuthToken";
import { computeMemberLevelProgress } from "../utils/memberLevel";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, InteractionManager, useWindowDimensions } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { confirmLogout } from "../utils/confirmLogout";
import { toast } from "../utils/toast";
import { pickAndUploadImage } from "../utils/uploadImage";
import { PrimaryButton } from "./ui/PrimaryButton";
import { HeaderIconButton, TabScreenHeader } from "./ui/TabScreenHeader";
import { useScreenStyles } from "../styles/screenStyles";
import { ORDER_STATUS } from "../config/constants";
import { useAppPublicConfig } from "../hooks/useAppPublicConfig";
import { FEATURE_KEYS, isFeatureVisibleForLocale, type FeatureKey } from "../config/featureRegistry";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { layout, radius, shadows, spacing, typography, font } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import { useAppTheme } from "../context/ThemeContext";
import { formatCurrency } from "../utils/formatCurrency";
import { maskPhone } from "../order-utils";
import { getAppLocale } from "../utils/i18nLocale";
import type { UserProfile } from "../types";
import { listRecentRevealSnapshots, type RevealSnapshot } from "../effects/revealSnapshotCache";
import { listShareAchievements, type ShareAchievement } from "../effects/revealShareAchievements";
import { loadStoryFragments } from "../effects/revealStoryFragments";
import { RemoteImage } from "./ui/RemoteImage";
import { qualityLabelFromRaw } from "../utils/quality";
import { useAppUpdateContext } from "../context/AppUpdateContext";
import { getLocalAppVersion } from "../utils/appVersion";
import { AnimatedRevealCard } from "./AnimatedRevealCard";

const APP_GRID_COLUMNS = 4;

function resolveAppGridCellWidth(gridWidth: number): number {
  const gap = spacing.xs;
  return Math.max(0, Math.floor((gridWidth - gap * (APP_GRID_COLUMNS - 1)) / APP_GRID_COLUMNS));
}

type Props = {
  userProfile: UserProfile | null;
  balanceAmount: number;
  balanceUpdatedAtText: string;
  onRefreshBalance: () => void;
  refreshingBalance: boolean;
  onOpenBalanceLogs: () => void;
  onOpenAddressManage: () => void;
  onOpenMessages: () => void;
  onOpenFeedback: () => void;
  onOpenSettings: () => void;
  onOpenLogin?: () => void;
  onOpenWarehouse?: () => void;
  onGoHome?: () => void;
  requireAuth?: (action?: () => void) => boolean;
  couponCount: number;
  messageBadge?: number;
  orderBadges: { pendingPay: number; pendingDelivery: number; pendingReceive: number; completed: number };
  orderTabCounts?: Record<string, number>;
  onOpenFeature: (title: string) => void;
  onFilterOrders: (status: string) => void;
  onUpdateNickname: (nickname: string) => Promise<void>;
  onUpdateAvatar: (avatar: string) => Promise<void>;
  onLogout?: () => void | Promise<void>;
  supportPhone?: string;
};

type VectorIconName = ComponentProps<typeof Ionicons>["name"] | ComponentProps<typeof MaterialCommunityIcons>["name"];

type PrimaryTool = {
  key: string;
  labelKey: string;
  iconSet: "ion" | "mci";
  icon: VectorIconName;
  action: "orders" | "warehouse" | "wallet" | "settings";
};

const PRIMARY_TOOLS: PrimaryTool[] = [
  { key: "orders", labelKey: "profile.toolOrders", iconSet: "ion", icon: "receipt-outline", action: "orders" },
  { key: "warehouse", labelKey: "profile.toolWarehouse", iconSet: "mci", icon: "archive-outline", action: "warehouse" },
  { key: "wallet", labelKey: "profile.toolCouponsWallet", iconSet: "ion", icon: "wallet-outline", action: "wallet" },
  { key: "settings", labelKey: "profile.toolSettings", iconSet: "ion", icon: "settings-outline", action: "settings" },
];

const ORDER_SHORTCUTS = [
  { key: "all", labelKey: "profile.orderAll", icon: "list-outline" as const, status: "ALL" },
  { key: "pay", labelKey: "profile.orderToPay", icon: "card-outline" as const, status: ORDER_STATUS.TO_BE_PAID },
  { key: "ship", labelKey: "profile.orderToShip", icon: "cube-outline" as const, status: ORDER_STATUS.TO_BE_DELIVERED },
  { key: "recv", labelKey: "profile.orderToReceive", icon: "boat-outline" as const, status: ORDER_STATUS.TO_BE_RECEIVED },
  { key: "done", labelKey: "profile.orderFinished", icon: "checkmark-circle-outline" as const, status: ORDER_STATUS.FINISHED },
] as const;

type MoreGridItem =
  | { labelKey: string; featureKey: FeatureKey; iconSet: "ion" | "mci"; icon: VectorIconName }
  | { labelKey: string; action: "address" | "feedback" | "invite"; iconSet: "ion" | "mci"; icon: VectorIconName };

const MORE_GRID: MoreGridItem[] = [
  { labelKey: "profile.toolInvite", action: "invite", iconSet: "ion", icon: "people-outline" },
  { labelKey: "profile.appFavorites", featureKey: FEATURE_KEYS.FAVORITES, iconSet: "ion", icon: "heart-outline" },
  { labelKey: "profile.appAddress", action: "address", iconSet: "ion", icon: "location-outline" },
  { labelKey: "profile.appCoupons", featureKey: FEATURE_KEYS.COUPONS, iconSet: "ion", icon: "ticket-outline" },
  { labelKey: "profile.appCheckIn", featureKey: FEATURE_KEYS.CHECK_IN, iconSet: "ion", icon: "calendar-outline" },
  { labelKey: "profile.appVip", featureKey: FEATURE_KEYS.VIP, iconSet: "ion", icon: "diamond-outline" },
  { labelKey: "profile.appSupport", featureKey: FEATURE_KEYS.CONTACT_SUPPORT, iconSet: "ion", icon: "chatbubbles-outline" },
  { labelKey: "profile.appWecom", featureKey: FEATURE_KEYS.ENTERPRISE_WECHAT, iconSet: "mci", icon: "wechat" },
  { labelKey: "profile.appInviteReward", featureKey: FEATURE_KEYS.INVITE_REWARD, iconSet: "ion", icon: "gift-outline" },
  { labelKey: "profile.appInviteCenter", featureKey: FEATURE_KEYS.INVITE_CENTER, iconSet: "ion", icon: "share-social-outline" },
  { labelKey: "profile.appRefunds", featureKey: FEATURE_KEYS.REFUNDS, iconSet: "ion", icon: "return-down-back-outline" },
  { labelKey: "profile.appFeedback", action: "feedback", iconSet: "ion", icon: "create-outline" },
  { labelKey: "profile.appEffectsCenter", featureKey: FEATURE_KEYS.EFFECTS_CENTER, iconSet: "ion", icon: "sparkles-outline" },
];

function ProfileGlyph({
  iconSet,
  icon,
  color,
  size = 22,
}: {
  iconSet: "ion" | "mci";
  icon: VectorIconName;
  color: string;
  size?: number;
}) {
  const a11y = { accessibilityElementsHidden: true as const, importantForAccessibility: "no-hide-descendants" as const };
  if (iconSet === "mci") {
    return <MaterialCommunityIcons name={icon as ComponentProps<typeof MaterialCommunityIcons>["name"]} size={size} color={color} {...a11y} />;
  }
  return <Ionicons name={icon as ComponentProps<typeof Ionicons>["name"]} size={size} color={color} {...a11y} />;
}

export function ProfileView(props: Props) {
  const {
    userProfile,
    balanceAmount,
    balanceUpdatedAtText,
    refreshingBalance,
    onOpenBalanceLogs,
    onOpenAddressManage,
    onOpenMessages,
    onOpenFeedback,
    onOpenSettings,
    onOpenLogin,
    onOpenWarehouse,
    requireAuth,
    couponCount,
    messageBadge = 0,
    orderBadges,
    orderTabCounts,
    onOpenFeature,
    onFilterOrders,
    onUpdateNickname,
    onUpdateAvatar,
    onLogout,
  } = props;
  const authToken = useAuthToken();
  const { width: windowWidth } = useWindowDimensions();
  const [appGridWidth, setAppGridWidth] = useState(0);
  const [moreToolsExpanded, setMoreToolsExpanded] = useState(false);
  const appCellWidth = useMemo(() => {
    const measured = appGridWidth > 0 ? resolveAppGridCellWidth(appGridWidth) : 0;
    if (measured > 0) return measured;
    const fallbackGrid = Math.max(0, windowWidth - spacing.lg * 4);
    return resolveAppGridCellWidth(fallbackGrid);
  }, [appGridWidth, windowWidth]);
  const appUpdate = useAppUpdateContext();
  const localVersion = useMemo(() => getLocalAppVersion(), []);

  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { confirm } = useConfirmDialog();
  const publicConfig = useAppPublicConfig();
  const [editVisible, setEditVisible] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [avatarDraft, setAvatarDraft] = useState("");
  const [savingNickname, setSavingNickname] = useState(false);
  const { stats: referralStats, loadError: referralError, refresh: refreshReferral } = useReferralStats(authToken);
  const [honorTitle, setHonorTitle] = useState<string | null>(null);
  const [honorLoading, setHonorLoading] = useState(false);
  const [honorLoadError, setHonorLoadError] = useState<string | null>(null);
  const [checkedToday, setCheckedToday] = useState<boolean | null>(null);
  const [checkInStreak, setCheckInStreak] = useState(0);
  const [recentHighlights, setRecentHighlights] = useState<RevealSnapshot[]>([]);
  const [shareAchievements, setShareAchievements] = useState<ShareAchievement[]>([]);
  const [storyFragmentCount, setStoryFragmentCount] = useState(0);

  const collectionBadge = useMemo(() => {
    const n = recentHighlights.length;
    if (n >= 8) return t("profile.collectorExpert");
    if (n >= 5) return t("profile.collectorAdvanced");
    if (n >= 2) return t("profile.collectorIntermediate");
    if (n >= 1) return t("profile.collectorBeginner");
    return t("profile.collectorLineDefault");
  }, [recentHighlights.length, t]);

  const luckyCoins = referralStats?.luckyCoins ?? userProfile?.luckyCoins ?? 0;
  const levelProgress = computeMemberLevelProgress(luckyCoins);

  useFocusEffect(
    useCallback(() => {
      if (!appUpdate.supported) return;
      void appUpdate.checkForUpdate({ silent: true });
    }, [appUpdate.supported, appUpdate.checkForUpdate]),
  );

  const handleCheckUpdate = useCallback(() => {
    void appUpdate.checkForUpdate({ manual: true });
  }, [appUpdate.checkForUpdate]);

  const showUpdateBadge =
    appUpdate.supported &&
    appUpdate.info?.hasUpdate &&
    appUpdate.info.versionCode > localVersion.versionCode;

  useEffect(() => {
    if (!authToken) {
      setRecentHighlights([]);
      setShareAchievements([]);
      setStoryFragmentCount(0);
      return;
    }
    const task = InteractionManager.runAfterInteractions(() => {
      void listRecentRevealSnapshots(8).then(setRecentHighlights);
      void listShareAchievements().then(setShareAchievements);
      void loadStoryFragments().then((fragments) => setStoryFragmentCount(fragments.length));
    });
    return () => task.cancel();
  }, [authToken]);

  useEffect(() => {
    if (!authToken) {
      setHonorTitle(null);
      setHonorLoadError(null);
      setCheckedToday(null);
      setCheckInStreak(0);
      return;
    }
    void getCheckInStatus(authToken)
      .then((status) => {
        setCheckedToday(status.checkedToday);
        setCheckInStreak(status.streakDays ?? 0);
      })
      .catch(() => {
        setCheckedToday(null);
        setCheckInStreak(0);
      });
    const task = InteractionManager.runAfterInteractions(() => {
      setHonorLoading(true);
      setHonorLoadError(null);
      void fetchLeaderboardMe(authToken)
        .then((me) => {
          if (me?.onBoard && me.title) setHonorTitle(me.title);
          else setHonorTitle(null);
        })
        .catch((error) => {
          setHonorTitle(null);
          setHonorLoadError(parseError(error));
        })
        .finally(() => setHonorLoading(false));
    });
    return () => task.cancel();
  }, [authToken]);

  const displayName = userProfile?.nickname?.trim() || maskPhone(userProfile?.phone);
  const loggedIn = Boolean(userProfile?.phone || userProfile?.nickname);
  const avatarUri = userProfile?.avatar?.trim() || "";

  const guard = (action: () => void) => {
    if (requireAuth) {
      requireAuth(action);
      return;
    }
    action();
  };

  const openEdit = () => {
    setNicknameDraft(userProfile?.nickname || "");
    setAvatarDraft(userProfile?.avatar || "");
    setEditVisible(true);
  };

  const styles = useThemedStyles((c) => buildProfileStyles(c));
  const screenStyles = useScreenStyles();
  const moreGridItems = useMemo(
    () =>
      MORE_GRID.filter(
        (item) =>
          !("featureKey" in item && item.featureKey) ||
          isFeatureVisibleForLocale(item.featureKey, getAppLocale(), publicConfig.featureFlags),
      ),
    [publicConfig.featureFlags],
  );

  const openPrimaryTool = (action: PrimaryTool["action"]) => {
    if (action === "orders") {
      guard(() => onFilterOrders("ALL"));
      return;
    }
    if (action === "warehouse") {
      if (onOpenWarehouse) {
        guard(onOpenWarehouse);
      }
      return;
    }
    if (action === "wallet") {
      guard(onOpenBalanceLogs);
      return;
    }
    guard(onOpenSettings);
  };

  const openMoreItem = (item: MoreGridItem) => {
    if ("action" in item && item.action === "address") {
      guard(onOpenAddressManage);
      return;
    }
    if ("action" in item && item.action === "feedback") {
      guard(onOpenFeedback);
      return;
    }
    if ("action" in item && item.action === "invite") {
      guard(() => onOpenFeature(FEATURE_KEYS.INVITE_FRIENDS));
      return;
    }
    if (item.labelKey === "profile.appCoupons") {
      guard(() => onOpenFeature(FEATURE_KEYS.COUPONS));
      return;
    }
    if ("featureKey" in item && item.featureKey) {
      guard(() => onOpenFeature(item.featureKey));
    }
  };

  const collectorLine = loggedIn
    ? `Lv.${levelProgress.level} · ${honorTitle || collectionBadge}`
    : t("profile.loginSyncHint");

  return (
    <View style={styles.root}>
      <TabScreenHeader
        title={t("profile.title")}
        variant="profile"
        rightSlot={
          <>
            <HeaderIconButton
              ion="chatbubble-outline"
              badge={messageBadge}
              label={t("profile.messagesA11y")}
              onPress={() => guard(onOpenMessages)}
            />
            <HeaderIconButton
              ion="settings-outline"
              label={t("profile.settingsA11y")}
              testID="profileSettingsButton"
              onPress={() => guard(onOpenSettings)}
            />
          </>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <AnimatedRevealCard delay={0}>
          <View style={styles.heroBlock}>
            <Pressable
              style={styles.avatar}
              onPress={() => (loggedIn ? openEdit() : onOpenLogin?.())}
              accessibilityRole="button"
              accessibilityLabel={loggedIn ? displayName : t("profile.tapLogin")}
            >
              {avatarUri ? (
                <RemoteImage uri={avatarUri} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <Text style={styles.avatarText}>{(displayName || "U").slice(0, 1).toUpperCase()}</Text>
              )}
            </Pressable>
            <Pressable
              style={styles.userInfo}
              onPress={() => (loggedIn ? openEdit() : onOpenLogin?.())}
              accessibilityRole="button"
              accessibilityLabel={loggedIn ? displayName : t("profile.tapLogin")}
            >
              <Text style={styles.userName}>{loggedIn ? displayName : t("profile.tapLogin")}</Text>
              <Text style={styles.collectorLine}>{collectorLine}</Text>
              {honorLoading ? <Text style={styles.honorMuted}>{t("profile.honorLoading")}</Text> : null}
              {!honorLoading && honorLoadError ? (
                <Pressable
                  onPress={() => {
                    if (!authToken) return;
                    setHonorLoadError(null);
                    setHonorLoading(true);
                    void fetchLeaderboardMe(authToken)
                      .then((me) => {
                        if (me?.onBoard && me.title) setHonorTitle(me.title);
                        else setHonorTitle(null);
                      })
                      .catch((error) => setHonorLoadError(parseError(error)))
                      .finally(() => setHonorLoading(false));
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t("profile.honorRetryA11y")}
                >
                  <Text style={styles.honorError}>{t("profile.honorLoadFailed")}</Text>
                </Pressable>
              ) : null}
              {loggedIn && storyFragmentCount > 0 ? (
                <Text style={styles.storyFragmentBadge}>
                  {t("profile.storyFragmentsBadge", { count: storyFragmentCount })}
                </Text>
              ) : null}
              {loggedIn ? <Text style={styles.userSub}>{maskPhone(userProfile?.phone)}</Text> : null}
            </Pressable>
            {!loggedIn ? (
              <Pressable
                style={styles.loginChip}
                onPress={() => onOpenLogin?.()}
                accessibilityRole="button"
                accessibilityLabel={t("profile.login")}
                testID="profileLoginButton"
              >
                <Text style={styles.loginChipText}>{t("profile.login")}</Text>
              </Pressable>
            ) : null}
          </View>
        </AnimatedRevealCard>

        <AnimatedRevealCard delay={40}>
          <View style={styles.walletRow}>
            <Pressable
              style={({ pressed }) => [styles.walletCell, pressed ? styles.pressablePressed : null]}
              onPress={() => guard(onOpenBalanceLogs)}
              accessibilityRole="button"
              accessibilityLabel={`${t("profile.balance")} ${formatCurrency(balanceAmount)}`}
            >
              <Text style={styles.walletValue}>{formatCurrency(balanceAmount)}</Text>
              <Text style={styles.walletLabel}>{t("profile.balance")}</Text>
            </Pressable>
            <View style={styles.walletDivider} />
            <Pressable
              style={({ pressed }) => [styles.walletCell, pressed ? styles.pressablePressed : null]}
              onPress={() => guard(() => onOpenFeature(FEATURE_KEYS.LUCKY_COINS))}
              accessibilityRole="button"
              accessibilityLabel={t("profile.luckyCoins")}
            >
              <Text style={styles.walletValue}>{luckyCoins}</Text>
              <Text style={styles.walletLabel}>{t("profile.luckyCoins")}</Text>
            </Pressable>
            <View style={styles.walletDivider} />
            <Pressable
              style={({ pressed }) => [styles.walletCell, pressed ? styles.pressablePressed : null]}
              onPress={() => guard(() => onOpenFeature(FEATURE_KEYS.COUPONS))}
              accessibilityRole="button"
              accessibilityLabel={t("profile.couponsCount", { count: couponCount })}
            >
              <Text style={styles.walletValue}>{couponCount}</Text>
              <Text style={styles.walletLabel}>{t("profile.appCoupons")}</Text>
            </Pressable>
          </View>
          {loggedIn ? (
            <Text style={styles.balanceMeta}>
              {refreshingBalance ? t("profile.syncing") : balanceUpdatedAtText}
              {checkedToday != null
                ? checkedToday
                  ? ` · ${t("profile.checkInToday")}`
                  : ` · ${t("profile.checkInPending")}`
                : null}
              {checkInStreak > 0 ? ` · ${t("profile.checkInStreak", { days: checkInStreak })}` : null}
            </Text>
          ) : null}
        </AnimatedRevealCard>

        {referralError ? <ListErrorBanner message={referralError} onRetry={() => void refreshReferral()} /> : null}

        {loggedIn && recentHighlights.length > 0 ? (
          <AnimatedRevealCard delay={70}>
            <View style={styles.shelfBlock}>
              <Text style={styles.shelfTitle}>{t("profile.recentHighlights")}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelfRow}>
                {recentHighlights.map((snap) => (
                  <View key={`${snap.orderId}:${snap.productId}`} style={styles.shelfCard}>
                    {snap.imageUri ? (
                      <RemoteImage uri={snap.imageUri} style={styles.shelfImage} contentFit="cover" />
                    ) : (
                      <View style={[styles.shelfImage, styles.shelfImagePlaceholder]}>
                        <Ionicons name="diamond-outline" size={28} color={colors.brand} />
                      </View>
                    )}
                    <Text style={styles.shelfName} numberOfLines={1}>
                      {snap.productName ?? t("profile.highlightUnknown")}
                    </Text>
                    <Text style={styles.shelfTier} numberOfLines={1}>
                      {qualityLabelFromRaw(snap.qualityType, t)}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          </AnimatedRevealCard>
        ) : null}

        {loggedIn && shareAchievements.length > 0 ? (
          <View style={styles.achievementsBlock}>
            <Text style={styles.shelfTitle}>{t("profile.shareAchievements")}</Text>
            {shareAchievements.map((row) => (
              <Text key={row.type} style={styles.shareAchievementRow}>
                {t("profile.shareAchievementRow", { type: row.type })}
              </Text>
            ))}
          </View>
        ) : null}

        <AnimatedRevealCard delay={100}>
          <View style={styles.primaryCard}>
            <View style={styles.primaryToolsRow}>
              {PRIMARY_TOOLS.map((tool) => (
                <Pressable
                  key={tool.key}
                  style={({ pressed }) => [styles.primaryTool, pressed ? styles.pressablePressed : null]}
                  onPress={() => openPrimaryTool(tool.action)}
                  accessibilityRole="button"
                  accessibilityLabel={t(tool.labelKey)}
                >
                  <View style={styles.primaryIconWrap}>
                    <ProfileGlyph iconSet={tool.iconSet} icon={tool.icon} color={colors.brand} size={22} />
                  </View>
                  <Text style={styles.primaryToolLabel}>{t(tool.labelKey)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </AnimatedRevealCard>

        <AnimatedRevealCard delay={130}>
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <Pressable
                style={styles.moreToolsHeader}
                onPress={() => setMoreToolsExpanded((v) => !v)}
                accessibilityRole="button"
                accessibilityState={{ expanded: moreToolsExpanded }}
                accessibilityLabel={t("profile.moreTools")}
              >
                <Text style={styles.sectionTitle}>{t("profile.moreTools")}</Text>
                <Ionicons
                  name={moreToolsExpanded ? "chevron-down" : "chevron-forward"}
                  size={16}
                  color={colors.textMuted}
                />
              </Pressable>
              <View style={styles.versionRow}>
                <Text style={styles.versionHint}>v{localVersion.versionName}</Text>
                {appUpdate.supported ? (
                  <Pressable
                    style={({ pressed }) => [styles.checkUpdateBtn, pressed ? styles.checkUpdateBtnPressed : null]}
                    accessibilityRole="button"
                    accessibilityLabel={t("profile.checkUpdateA11y")}
                    onPress={handleCheckUpdate}
                    disabled={appUpdate.phase === "checking"}
                  >
                    <Text style={styles.checkUpdateText}>
                      {appUpdate.phase === "checking" ? t("profile.syncing") : t("profile.checkUpdate")}
                    </Text>
                    {showUpdateBadge ? <View style={styles.updateDot} /> : null}
                  </Pressable>
                ) : null}
              </View>
            </View>
            {moreToolsExpanded ? (
              <>
                <View style={styles.orderRow}>
                  {ORDER_SHORTCUTS.map((item) => {
                    const tabCount = orderTabCounts?.[item.status];
                    const badge =
                      tabCount != null
                        ? tabCount
                        : item.key === "all"
                          ? orderBadges.pendingPay +
                            orderBadges.pendingDelivery +
                            orderBadges.pendingReceive +
                            orderBadges.completed
                          : item.key === "pay"
                            ? orderBadges.pendingPay
                            : item.key === "ship"
                              ? orderBadges.pendingDelivery
                              : item.key === "recv"
                                ? orderBadges.pendingReceive
                                : orderBadges.completed;
                    return (
                      <Pressable
                        key={item.key}
                        style={({ pressed }) => [styles.orderItem, pressed ? styles.pressablePressed : null]}
                        onPress={() => guard(() => onFilterOrders(item.status))}
                        accessibilityRole="button"
                        accessibilityLabel={t("profile.orderBadge", {
                          label: t(item.labelKey),
                          count: badge > 0 ? badge : 0,
                        })}
                      >
                        <Ionicons name={item.icon} size={18} color={colors.brand} />
                        <Text style={styles.orderLabel}>{t(item.labelKey)}</Text>
                        {badge > 0 ? <Text style={styles.orderBadge}>{badge}</Text> : null}
                      </Pressable>
                    );
                  })}
                </View>
                {(referralStats?.invitedCount || referralStats?.totalCommission) ? (
                  <Pressable
                    style={({ pressed }) => [styles.inviteCompact, pressed ? styles.pressablePressed : null]}
                    onPress={() => onOpenFeature(FEATURE_KEYS.INVITE_FRIENDS)}
                    accessibilityRole="button"
                    accessibilityLabel={t("profile.inviteFriends")}
                  >
                    <View style={styles.inviteCompactLeft}>
                      <Text style={styles.inviteCompactTitle}>{t("profile.inviteTitle")}</Text>
                      <Text style={styles.inviteCompactMeta}>
                        {formatCurrency(referralStats?.totalCommission ?? 0)} · {referralStats?.invitedCount ?? 0}{" "}
                        {t("profile.invitedFriends")}
                      </Text>
                    </View>
                    <Text style={styles.inviteCompactCta}>{t("profile.inviteFriends")}</Text>
                  </Pressable>
                ) : null}
                <View
                  style={styles.appGrid}
                  onLayout={(event) => {
                    const nextWidth = Math.round(event.nativeEvent.layout.width);
                    setAppGridWidth((prev) => (prev === nextWidth ? prev : nextWidth));
                  }}
                >
                  {moreGridItems.map((item) => (
                    <Pressable
                      key={item.labelKey}
                      style={({ pressed }) => [
                        styles.appCell,
                        { width: appCellWidth, maxWidth: appCellWidth },
                        pressed ? styles.pressablePressed : null,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={t(item.labelKey)}
                      onPress={() => openMoreItem(item)}
                    >
                      <View style={styles.appIconWrap}>
                        <ProfileGlyph iconSet={item.iconSet} icon={item.icon} color={colors.brand} size={20} />
                      </View>
                      <Text style={styles.appLabel}>
                        {item.labelKey === "profile.appCoupons"
                          ? t("profile.couponsCount", { count: couponCount })
                          : t(item.labelKey)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : (
              <Text style={styles.moreToolsHint}>{t("profile.moreToolsHint")}</Text>
            )}
          </View>
        </AnimatedRevealCard>

        {loggedIn ? (
          <>
            <PrimaryButton label={t("profile.editProfile")} variant="ghost" onPress={openEdit} style={styles.logoutBtn} />
            {onLogout ? (
              <PrimaryButton
                label={t("profile.logout")}
                variant="ghost"
                onPress={() => void confirmLogout(confirm, onLogout, t)}
                style={styles.logoutBtn}
              />
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <View style={styles.modalMask}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("profile.editProfile")}</Text>
            <TextInput
              value={nicknameDraft}
              onChangeText={setNicknameDraft}
              placeholder={t("profile.editNickname")}
              placeholderTextColor={colors.textMuted}
              style={screenStyles.input}
              accessibilityLabel={t("profile.nicknameLabel")}
            />
            <TextInput
              value={avatarDraft}
              onChangeText={setAvatarDraft}
              placeholder={t("profile.editAvatarUrl")}
              placeholderTextColor={colors.textMuted}
              style={[screenStyles.input, { marginTop: spacing.sm }]}
              accessibilityLabel={t("profile.avatarUrlLabel")}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("profile.pickAvatar")}
              style={styles.pickAvatarBtn}
              onPress={async () => {
                const url = await pickAndUploadImage(authToken);
                if (url) {
                  setAvatarDraft(url);
                  toast.success(t("profile.avatarUploaded"));
                }
              }}
            >
              <Text style={styles.pickAvatarText}>{t("profile.pickAvatar")}</Text>
            </Pressable>
            <View style={styles.modalActions}>
              <PrimaryButton label={t("common.cancel")} variant="ghost" onPress={() => setEditVisible(false)} style={styles.flexBtn} />
              <PrimaryButton
                label={savingNickname ? t("address.saving") : t("common.submit")}
                loading={savingNickname}
                disabled={!nicknameDraft.trim() || savingNickname}
                onPress={async () => {
                  setSavingNickname(true);
                  try {
                    await onUpdateNickname(nicknameDraft.trim());
                    if (avatarDraft.trim()) {
                      await onUpdateAvatar(avatarDraft.trim());
                    }
                    setEditVisible(false);
                  } finally {
                    setSavingNickname(false);
                  }
                }}
                style={styles.flexBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function buildProfileStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgPage },
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingBottom: layout.screenPaddingBottom,
      gap: spacing.md,
    },
    heroBlock: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingBottom: spacing.xs,
    },
    avatar: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.bgCard,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: colors.profileHeaderDeep,
      overflow: "hidden",
      ...shadows.cardSm,
    },
    avatarImage: { width: "100%", height: "100%" },
    avatarText: { fontSize: typography.h2, fontWeight: "800", color: colors.brand },
    userInfo: { flex: 1 },
    loginChip: {
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    loginChipText: { color: colors.textOnBrand, fontWeight: "800", fontSize: typography.caption },
    userName: { ...font("bodySemiBold"), fontSize: typography.h3, fontWeight: "700", color: colors.textPrimary },
    collectorLine: {
      marginTop: 4,
      fontSize: typography.caption,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    honorMuted: {
      marginTop: 4,
      fontSize: typography.micro,
      color: colors.textMuted,
    },
    storyFragmentBadge: {
      alignSelf: "flex-start",
      marginTop: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: radius.pill,
      backgroundColor: colors.bgBrandSoft,
      color: colors.brand,
      fontSize: typography.caption,
      fontWeight: "700",
    },
    honorError: {
      marginTop: 4,
      fontSize: typography.caption,
      color: colors.danger,
      fontWeight: "600",
    },
    userSub: { marginTop: spacing.xs, fontSize: typography.micro, color: colors.textMuted },
    walletRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.bgCard,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      ...shadows.cardSm,
    },
    walletCell: { flex: 1, alignItems: "center", paddingHorizontal: spacing.xs },
    pressablePressed: { opacity: 0.9 },
    walletDivider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch", backgroundColor: colors.border, marginVertical: 4 },
    walletValue: { fontSize: typography.bodyLg, fontWeight: "800", color: colors.textPrimary },
    walletLabel: { marginTop: 2, fontSize: typography.micro, color: colors.textMuted, fontWeight: "600" },
    balanceMeta: {
      textAlign: "center",
      fontSize: typography.micro,
      color: colors.textMuted,
      marginTop: spacing.xs,
    },
    shelfBlock: { gap: spacing.sm },
    shelfTitle: { fontWeight: "800", fontSize: typography.body, color: colors.textPrimary },
    shelfRow: { gap: spacing.sm, paddingRight: spacing.md },
    shelfCard: {
      width: 100,
      backgroundColor: colors.bgCard,
      borderRadius: radius.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: "hidden",
      paddingBottom: spacing.xs,
    },
    shelfImage: { width: 100, height: 80, backgroundColor: colors.bgSoft },
    shelfImagePlaceholder: { alignItems: "center", justifyContent: "center" },
    shelfName: {
      marginTop: spacing.xs,
      marginHorizontal: spacing.xs,
      fontSize: typography.micro,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    shelfTier: { marginHorizontal: spacing.xs, fontSize: typography.micro, color: colors.textMuted },
    achievementsBlock: { gap: spacing.xs },
    shareAchievementRow: { fontSize: typography.caption, color: colors.textSecondary },
    primaryCard: {
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      ...shadows.cardSm,
    },
    primaryToolsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: spacing.xs,
    },
    primaryTool: {
      flex: 1,
      minWidth: 0,
      alignItems: "center",
      paddingVertical: spacing.xs,
    },
    primaryIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.bgBrandSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryToolLabel: {
      marginTop: spacing.xs,
      fontSize: typography.micro,
      fontWeight: "700",
      color: colors.textSecondary,
      textAlign: "center",
    },
    moreToolsHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      flexShrink: 1,
    },
    moreToolsHint: {
      marginTop: spacing.xs,
      fontSize: typography.micro,
      color: colors.textMuted,
    },
    sectionCard: {
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      ...shadows.cardSm,
    },
    sectionTitle: { fontWeight: "800", fontSize: typography.bodyLg, color: colors.textPrimary },
    sectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.md,
      gap: spacing.sm,
    },
    versionHint: { fontSize: typography.micro, color: colors.textMuted, fontWeight: "600" },
    versionRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
    checkUpdateBtn: {
      position: "relative",
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radius.pill,
      backgroundColor: colors.bgSoft,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    checkUpdateBtnPressed: { opacity: 0.85 },
    checkUpdateText: { fontSize: typography.micro, color: colors.brand, fontWeight: "700" },
    updateDot: {
      position: "absolute",
      top: -2,
      right: -2,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.accent,
      borderWidth: 1,
      borderColor: colors.bgCard,
    },
    orderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: spacing.xs,
      marginBottom: spacing.md,
      paddingBottom: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    orderItem: {
      flex: 1,
      minWidth: 0,
      alignItems: "center",
      position: "relative",
      paddingVertical: spacing.xs,
      overflow: "visible",
    },
    orderLabel: {
      marginTop: spacing.xs,
      fontSize: 9,
      fontWeight: "700",
      color: colors.textSecondary,
      textAlign: "center",
    },
    orderBadge: {
      position: "absolute",
      top: -2,
      right: 0,
      minWidth: 16,
      paddingHorizontal: 3,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.accent,
      color: colors.textOnBrand,
      fontSize: 9,
      fontWeight: "800",
      textAlign: "center",
      overflow: "hidden",
      lineHeight: 14,
    },
    inviteCompact: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginBottom: spacing.md,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.bgSoft,
    },
    inviteCompactLeft: { flex: 1, minWidth: 0 },
    inviteCompactTitle: { fontWeight: "700", fontSize: typography.caption, color: colors.textPrimary },
    inviteCompactMeta: { marginTop: 2, fontSize: typography.micro, color: colors.textMuted },
    inviteCompactCta: { color: colors.brand, fontWeight: "800", fontSize: typography.micro },
    appGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.xs,
      width: "100%",
    },
    appCell: {
      alignItems: "center",
      paddingVertical: spacing.sm,
      flexShrink: 0,
    },
    appIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: colors.bgBrandSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    appLabel: {
      marginTop: spacing.xs,
      fontSize: typography.micro,
      fontWeight: "600",
      color: colors.textSecondary,
      textAlign: "center",
    },
    logoutBtn: { marginTop: spacing.sm },
    modalMask: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
    modalCard: {
      backgroundColor: colors.bgCard,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.xl,
      paddingBottom: spacing.xxl,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.card,
    },
    modalTitle: { fontWeight: "800", fontSize: typography.h4, marginBottom: spacing.md, color: colors.textPrimary },
    pickAvatarBtn: {
      marginTop: spacing.sm,
      paddingVertical: spacing.sm,
      alignItems: "center",
      borderRadius: radius.md,
      backgroundColor: colors.profileHeaderBg,
    },
    pickAvatarText: { color: colors.brand, fontWeight: "700", fontSize: typography.caption },
    modalActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
    flexBtn: { flex: 1 },
  });
}

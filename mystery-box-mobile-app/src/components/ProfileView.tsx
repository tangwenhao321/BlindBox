import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { FEATURE_KEYS, isFeatureVisibleForLocale } from "../config/featureRegistry";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { layout, radius, shadows, spacing, typography } from "../styles/tokens";
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

const ORDER_SHORTCUTS = [
  { key: "all", labelKey: "profile.orderAll", icon: "📋", status: "ALL" },
  { key: "pay", labelKey: "profile.orderToPay", icon: "💳", status: ORDER_STATUS.TO_BE_PAID },
  { key: "ship", labelKey: "profile.orderToShip", icon: "🚚", status: ORDER_STATUS.TO_BE_DELIVERED },
  { key: "recv", labelKey: "profile.orderToReceive", icon: "🎁", status: ORDER_STATUS.TO_BE_RECEIVED },
  { key: "done", labelKey: "profile.orderFinished", icon: "✈️", status: ORDER_STATUS.FINISHED },
] as const;

const APP_GRID = [
  { labelKey: "profile.appVip", featureKey: FEATURE_KEYS.VIP, icon: "👑" },
  { labelKey: "profile.appCheckIn", featureKey: FEATURE_KEYS.CHECK_IN, icon: "📅" },
  { labelKey: "profile.appCoupons", featureKey: FEATURE_KEYS.COUPONS, icon: "🎫" },
  { labelKey: "profile.appAddress", action: "address" as const, icon: "📍" },
  { labelKey: "profile.appSupport", featureKey: FEATURE_KEYS.CONTACT_SUPPORT, icon: "💬" },
  { labelKey: "profile.appWecom", featureKey: FEATURE_KEYS.ENTERPRISE_WECHAT, icon: "💼" },
  { labelKey: "profile.appInviteReward", featureKey: FEATURE_KEYS.INVITE_REWARD, icon: "🎁" },
  { labelKey: "profile.appInviteCenter", featureKey: FEATURE_KEYS.INVITE_CENTER, icon: "🤝" },
  { labelKey: "profile.appFavorites", featureKey: FEATURE_KEYS.FAVORITES, icon: "⭐" },
  { labelKey: "profile.appRefunds", featureKey: FEATURE_KEYS.REFUNDS, icon: "↩️" },
  { labelKey: "profile.appFeedback", action: "feedback" as const, icon: "📝" },
  { labelKey: "profile.appSettings", action: "settings" as const, icon: "⚙️" },
];

export function ProfileView(props: Props) {
  const {
    userProfile,
    balanceAmount,
    balanceUpdatedAtText,
    onRefreshBalance,
    refreshingBalance,
    onOpenBalanceLogs,
    onOpenAddressManage,
    onOpenMessages,
    onOpenFeedback,
    onOpenSettings,
    onOpenLogin,
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
    supportPhone,
  } = props;
  const authToken = useAuthToken();
  const { width: windowWidth } = useWindowDimensions();
  const [appGridWidth, setAppGridWidth] = useState(0);
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
    if (n >= 8) return t("profile.collectorExpert", { defaultValue: "Collector expert" });
    if (n >= 5) return t("profile.collectorAdvanced", { defaultValue: "Advanced collector" });
    if (n >= 2) return t("profile.collectorIntermediate", { defaultValue: "Intermediate collector" });
    if (n >= 1) return t("profile.collectorBeginner", { defaultValue: "Beginner collector" });
    return null;
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
  const appGridItems = useMemo(
    () =>
      APP_GRID.filter(
        (item) =>
          !("featureKey" in item && item.featureKey) ||
          isFeatureVisibleForLocale(item.featureKey, getAppLocale(), publicConfig.featureFlags),
      ),
    [publicConfig.featureFlags],
  );

  return (
    <View style={styles.root}>
      <TabScreenHeader
        title={t("profile.title")}
        variant="profile"
        rightSlot={
          <>
            <HeaderIconButton
              icon="💬"
              badge={messageBadge}
              label={t("profile.messagesA11y")}
              onPress={() => guard(onOpenMessages)}
            />
            <HeaderIconButton
              icon="⚙"
              label={t("profile.settingsA11y")}
              testID="profileSettingsButton"
              onPress={() => guard(onOpenSettings)}
            />
          </>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.userRow}>
          <Pressable
            style={styles.avatar}
            onPress={() => (loggedIn ? openEdit() : onOpenLogin?.())}
            accessibilityRole="button"
            accessibilityLabel={loggedIn ? displayName : t("profile.tapLogin")}
          >
            <Text style={styles.avatarText}>{(displayName || "U").slice(0, 1).toUpperCase()}</Text>
          </Pressable>
          <Pressable
            style={styles.userInfo}
            onPress={() => (loggedIn ? openEdit() : onOpenLogin?.())}
            accessibilityRole="button"
            accessibilityLabel={loggedIn ? displayName : t("profile.tapLogin")}
          >
            <Text style={styles.userName}>{loggedIn ? displayName : t("profile.tapLogin")}</Text>
            {honorLoading ? <Text style={styles.honorBadge}>{t("profile.honorLoading")}</Text> : null}
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
            {!honorLoading && !honorLoadError && honorTitle ? <Text style={styles.honorBadge}>{honorTitle}</Text> : null}
            {loggedIn && storyFragmentCount > 0 ? (
              <Text style={styles.storyFragmentBadge}>
                {t("profile.storyFragmentsBadge", { count: storyFragmentCount })}
              </Text>
            ) : null}
            <Text style={styles.userSub}>
              {loggedIn ? maskPhone(userProfile?.phone) : t("profile.loginSyncHint")}
            </Text>
          </Pressable>
          {!loggedIn ? (
            <Pressable style={styles.loginChip} onPress={() => onOpenLogin?.()} accessibilityRole="button" accessibilityLabel={t("profile.login")} testID="profileLoginButton">
              <Text style={styles.loginChipText}>{t("profile.login")}</Text>
            </Pressable>
          ) : null}
        </View>

        <View
          style={styles.levelCard}
          accessibilityRole="summary"
          accessibilityLabel={
            levelProgress.nextLevelAt != null
              ? t("profile.levelProgress", {
                  level: levelProgress.level,
                  title: levelProgress.title,
                  current: levelProgress.currentPoints,
                  next: levelProgress.nextLevelAt,
                })
              : t("profile.levelMax", {
                  level: levelProgress.level,
                  title: levelProgress.title,
                  current: levelProgress.currentPoints,
                })
          }
        >
          <Text style={styles.levelIcon}>✦</Text>
          <View style={styles.levelBody}>
            <Text style={styles.levelText}>
              Lv.{levelProgress.level} {levelProgress.title}
            </Text>
            <View style={styles.levelBarTrack}>
              <View style={[styles.levelBarFill, { width: `${Math.round(levelProgress.progress * 100)}%` }]} />
            </View>
            <Text style={styles.levelMeta}>
              {levelProgress.nextLevelAt != null
                ? t("profile.levelCoinsUpgrade", {
                    current: levelProgress.currentPoints,
                    next: levelProgress.nextLevelAt,
                  })
                : t("profile.levelCoinsMax", { current: levelProgress.currentPoints })}
              {loggedIn && checkedToday != null
                ? checkedToday
                  ? ` · ${t("profile.checkInToday")}`
                  : ` · ${t("profile.checkInPending")}`
                : null}
            </Text>
          </View>
          <Pressable
            style={styles.orangeBtn}
            onPress={() => onOpenFeature(FEATURE_KEYS.CHECK_IN)}
            accessibilityRole="button"
            accessibilityLabel={checkedToday ? t("profile.checkInToday") : t("profile.goCheckIn")}
          >
            <Text style={styles.orangeBtnText}>{checkedToday ? t("profile.checkInToday") : t("profile.goCheckIn")}</Text>
          </Pressable>
        </View>
        {loggedIn && checkInStreak > 0 ? (
          <Text style={styles.checkInHint}>{t("profile.checkInStreak", { days: checkInStreak })}</Text>
        ) : null}

        <View style={styles.statsRow}>
          <Pressable style={styles.statCell} onPress={() => guard(onOpenBalanceLogs)} accessibilityRole="button" accessibilityLabel={`${t("profile.balance")} ${formatCurrency(balanceAmount)}`}>
            <Text style={styles.statValue}>{formatCurrency(balanceAmount)}</Text>
            <Text style={styles.statLabel}>{t("profile.balance")}</Text>
          </Pressable>
          <View style={styles.statDivider} />
          <Pressable
            style={styles.statCell}
            onPress={() => guard(() => onOpenFeature(FEATURE_KEYS.LUCKY_COINS))}
            accessibilityRole="button"
            accessibilityLabel={t("profile.luckyCoins")}
          >
            <Text style={styles.statValue}>{referralStats?.luckyCoins ?? userProfile?.luckyCoins ?? 0}</Text>
            <Text style={styles.statLabel}>{t("profile.luckyCoins")}</Text>
          </Pressable>
        </View>
        {loggedIn ? (
          <Text style={styles.balanceMeta}>{refreshingBalance ? t("profile.syncing") : balanceUpdatedAtText}</Text>
        ) : null}

        {referralError ? (
          <ListErrorBanner message={referralError} onRetry={() => void refreshReferral()} />
        ) : null}
        {loggedIn && collectionBadge ? (
          <Text style={styles.collectionBadge}>{collectionBadge}</Text>
        ) : null}
        {loggedIn && recentHighlights.length > 0 ? (
          <View style={styles.highlightsBlock}>
            <Text style={styles.sectionTitle}>{t("profile.recentHighlights")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.highlightsRow}>
              {recentHighlights.map((snap) => (
                <View key={`${snap.orderId}:${snap.productId}`} style={styles.highlightCard}>
                  {snap.imageUri ? (
                    <RemoteImage uri={snap.imageUri} style={styles.highlightImage} contentFit="cover" />
                  ) : (
                    <View style={[styles.highlightImage, styles.highlightImagePlaceholder]}>
                      <Text style={styles.highlightPlaceholderText}>✦</Text>
                    </View>
                  )}
                  <Text style={styles.highlightName} numberOfLines={1}>
                    {snap.productName ?? t("profile.highlightUnknown")}
                  </Text>
                  <Text style={styles.highlightTier} numberOfLines={1}>
                    {qualityLabelFromRaw(snap.qualityType, t)}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}
        {loggedIn && shareAchievements.length > 0 ? (
          <View style={styles.highlightsBlock}>
            <Text style={styles.sectionTitle}>{t("profile.shareAchievements", { defaultValue: "Share achievements" })}</Text>
            {shareAchievements.map((row) => (
              <Text key={row.type} style={styles.shareAchievementRow}>
                {t("profile.shareAchievementRow", {
                  defaultValue: "{{type}}",
                  type: row.type,
                })}
              </Text>
            ))}
          </View>
        ) : null}
        <View style={styles.inviteCard}>
          <View style={styles.inviteLeft}>
            <Text style={styles.inviteTitle}>{t("profile.inviteTitle")}</Text>
            <View style={styles.inviteStats}>
              <Pressable
                onPress={() => onOpenFeature(FEATURE_KEYS.COMMISSION)}
                accessibilityRole="button"
                accessibilityLabel={t("profile.totalCommission")}
              >
                <Text style={styles.inviteStatValue}>
                  {formatCurrency(referralStats?.totalCommission ?? 0)}
                </Text>
                <Text style={styles.inviteStatLabel}>{t("profile.totalCommission")}</Text>
              </Pressable>
              <View>
                <Text style={styles.inviteStatValue}>{referralStats?.invitedCount ?? 0}</Text>
                <Text style={styles.inviteStatLabel}>{t("profile.invitedFriends")}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.inviteArt}>🧧</Text>
          <Pressable
            style={[styles.orangeBtn, styles.inviteBtn]}
            onPress={() => onOpenFeature(FEATURE_KEYS.INVITE_FRIENDS)}
            accessibilityRole="button"
            accessibilityLabel={t("profile.inviteFriends")}
          >
            <Text style={styles.orangeBtnText}>{t("profile.inviteFriends")}</Text>
          </Pressable>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t("profile.myOrders")}</Text>
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
                  style={styles.orderItem}
                  onPress={() =>
                    guard(() => onFilterOrders(item.status))
                  }
                  accessibilityRole="button"
                  accessibilityLabel={t("profile.orderBadge", {
                    label: t(item.labelKey),
                    count: badge > 0 ? badge : 0,
                  })}
                >
                  <Text style={styles.orderIcon}>{item.icon}</Text>
                  <Text style={styles.orderLabel}>{t(item.labelKey)}</Text>
                  {badge > 0 ? <Text style={styles.orderBadge}>{badge}</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>{t("profile.myApps")}</Text>
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
          <View
            style={styles.appGrid}
            onLayout={(event) => {
              const nextWidth = Math.round(event.nativeEvent.layout.width);
              setAppGridWidth((prev) => (prev === nextWidth ? prev : nextWidth));
            }}
          >
            {appGridItems.map((item) => (
              <Pressable
                key={item.labelKey}
                style={[styles.appCell, { width: appCellWidth, maxWidth: appCellWidth }]}
                accessibilityRole="button"
                accessibilityLabel={t(item.labelKey)}
                onPress={() => {
                  if ("action" in item && item.action === "address") {
                    guard(onOpenAddressManage);
                    return;
                  }
                  if ("action" in item && item.action === "feedback") {
                    guard(onOpenFeedback);
                    return;
                  }
                  if ("action" in item && item.action === "settings") {
                    guard(onOpenSettings);
                    return;
                  }
                  if (item.labelKey === "profile.appCoupons") {
                    guard(() => onOpenFeature(FEATURE_KEYS.COUPONS));
                    return;
                  }
                  if ("featureKey" in item && item.featureKey) {
                    guard(() => onOpenFeature(item.featureKey));
                  }
                }}
              >
                <Text style={styles.appIcon}>{"icon" in item ? item.icon : "◇"}</Text>
                <Text style={styles.appLabel}>
                  {item.labelKey === "profile.appCoupons"
                    ? t("profile.couponsCount", { count: couponCount })
                    : t(item.labelKey)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

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
  root: { flex: 1, backgroundColor: colors.profilePinkSoft },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: layout.screenPaddingBottom,
    gap: spacing.md,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.bgCard,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.profileHeaderDeep,
    ...shadows.cardSm,
  },
  avatarText: { fontSize: typography.h2, fontWeight: "800", color: colors.profilePink },
  userInfo: { flex: 1 },
  loginChip: {
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  loginChipText: { color: colors.textOnBrand, fontWeight: "800", fontSize: typography.caption },
  userName: { fontSize: typography.h4, fontWeight: "800", color: colors.textPrimary },
  honorBadge: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.warningSoft,
    color: colors.warning,
    fontSize: typography.caption,
    fontWeight: "700",
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
  userSub: { marginTop: spacing.xs, fontSize: typography.caption, color: colors.textSecondary },
  levelCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.cardSm,
  },
  levelIcon: { fontSize: 20, color: colors.profilePink },
  levelBody: { flex: 1, gap: 4 },
  levelText: { fontSize: typography.caption, fontWeight: "800", color: colors.textPrimary },
  levelBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.bgSoft,
    overflow: "hidden",
  },
  levelBarFill: { height: "100%", backgroundColor: colors.profilePink, borderRadius: 3 },
  levelMeta: { fontSize: typography.micro, color: colors.textMuted, fontWeight: "600" },
  checkInHint: {
    marginTop: -spacing.xs,
    textAlign: "center",
    fontSize: typography.micro,
    color: colors.brand,
    fontWeight: "700",
  },
  orangeBtn: {
    backgroundColor: colors.accentOrange,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  orangeBtnText: { color: colors.textOnBrand, fontWeight: "800", fontSize: typography.micro },
  statsRow: {
    flexDirection: "row",
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.cardSm,
  },
  statCell: { flex: 1, alignItems: "center" },
  statDivider: { width: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.xs },
  statValue: { fontSize: typography.h3, fontWeight: "800", color: colors.textPrimary },
  statLabel: { marginTop: spacing.xs, fontSize: typography.micro, color: colors.textMuted, fontWeight: "600" },
  balanceMeta: {
    textAlign: "center",
    fontSize: typography.micro,
    color: colors.textMuted,
    marginTop: -spacing.xs,
  },
  balanceMetaLink: { color: colors.link, fontWeight: "700" },
  highlightsBlock: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  collectionBadge: {
    marginTop: spacing.sm,
    fontSize: typography.caption,
    fontWeight: "800",
    color: colors.brand,
  },
  shareAchievementRow: {
    fontSize: typography.caption,
    color: colors.textSecondary,
  },
  highlightsRow: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  highlightCard: {
    width: 108,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
    paddingBottom: spacing.xs,
  },
  highlightImage: {
    width: 108,
    height: 88,
    backgroundColor: colors.bgSoft,
  },
  highlightImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  highlightPlaceholderText: { fontSize: 28 },
  highlightName: {
    marginTop: spacing.xs,
    marginHorizontal: spacing.xs,
    fontSize: typography.micro,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  highlightTier: {
    marginHorizontal: spacing.xs,
    fontSize: typography.micro,
    color: colors.textMuted,
  },
  inviteCard: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.cardSm,
  },
  inviteLeft: { flex: 1, minWidth: 160 },
  inviteTitle: { fontWeight: "800", fontSize: typography.body, color: colors.textPrimary },
  inviteStats: { flexDirection: "row", gap: spacing.xl, marginTop: spacing.sm },
  inviteStatValue: { fontWeight: "800", fontSize: typography.h4, color: colors.textPrimary },
  inviteStatLabel: { fontSize: typography.micro, color: colors.textMuted, marginTop: 2 },
  inviteArt: { fontSize: 36 },
  inviteBtn: { marginLeft: "auto" },
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
  orderRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.xs },
  orderItem: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    position: "relative",
    paddingVertical: spacing.xs,
    overflow: "visible",
  },
  orderIcon: { fontSize: 24 },
  orderLabel: {
    marginTop: spacing.xs,
    fontSize: typography.micro,
    fontWeight: "700",
    color: colors.textSecondary,
    textAlign: "center",
  },
  orderBadge: {
    position: "absolute",
    top: -2,
    right: 0,
    minWidth: 18,
    paddingHorizontal: 4,
    height: 18,
    borderRadius: 8,
    backgroundColor: colors.accent,
    color: colors.textOnBrand,
    fontSize: 9,
    fontWeight: "800",
    textAlign: "center",
    overflow: "hidden",
    lineHeight: 16,
  },
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
  appIcon: { fontSize: 22, color: colors.textPrimary },
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
  pickAvatarText: { color: colors.profilePink, fontWeight: "700", fontSize: typography.caption },
  modalActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  flexBtn: { flex: 1 },
  });
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { parseError } from "../api";
import { fetchLeaderboardMe } from "../services/leaderboardService";
import { getCheckInStatus } from "../services/welfareService";
import { useReferralStats } from "../hooks/useReferralStats";
import { useAuthToken } from "../hooks/useAuthToken";
import { computeMemberLevelProgress } from "../utils/memberLevel";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { ScrollView, View, InteractionManager, useWindowDimensions } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useConfirmDialog } from "../context/ConfirmDialogContext";
import { confirmLogout } from "../utils/confirmLogout";
import { toast } from "../utils/toast";
import { PrimaryButton } from "./ui/PrimaryButton";
import { HeaderIconButton, TabScreenHeader } from "./ui/TabScreenHeader";
import { useScreenStyles } from "../styles/screenStyles";
import { useAppPublicConfig } from "../hooks/useAppPublicConfig";
import { FEATURE_KEYS, isFeatureVisibleForLocale } from "../config/featureRegistry";
import { isIosDigitalGoodsRestricted } from "../utils/iosDigitalGoodsGate";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { spacing } from "../styles/tokens";
import { maskPhone } from "../order-utils";
import { getAppLocale } from "../utils/i18nLocale";
import type { UserProfile } from "../types";
import { listRecentRevealSnapshots, type RevealSnapshot } from "../effects/revealSnapshotCache";
import { listShareAchievements, type ShareAchievement } from "../effects/revealShareAchievements";
import { loadStoryFragments } from "../effects/revealStoryFragments";
import { useAppUpdateContext } from "../context/AppUpdateContext";
import { getLocalAppVersion } from "../utils/appVersion";
import {
  MORE_GRID,
  ProfileEditModal,
  ProfileHeroSection,
  ProfileHighlightsSection,
  ProfileMoreToolsSection,
  ProfilePrimaryToolsSection,
  ProfileWalletSection,
  buildProfileStyles,
  resolveAppGridCellWidth,
  type MoreGridItem,
  type PrimaryTool,
} from "./profile";

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
    }, [appUpdate]),
  );

  const handleCheckUpdate = useCallback(() => {
    void appUpdate.checkForUpdate({ manual: true });
  }, [appUpdate]);

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
      .catch((error) => {
        setCheckedToday(null);
        setCheckInStreak(0);
        toast.error(parseError(error));
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
          (isFeatureVisibleForLocale(item.featureKey, getAppLocale(), publicConfig.featureFlags) &&
            /* ios-vip-gate */ !(item.featureKey === FEATURE_KEYS.VIP && isIosDigitalGoodsRestricted())),
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
        <ProfileHeroSection
          loggedIn={loggedIn}
          displayName={displayName}
          avatarUri={avatarUri}
          collectorLine={collectorLine}
          honorLoading={honorLoading}
          honorLoadError={honorLoadError}
          storyFragmentCount={storyFragmentCount}
          userProfile={userProfile}
          authToken={authToken}
          onOpenEdit={openEdit}
          onOpenLogin={onOpenLogin}
          setHonorLoading={setHonorLoading}
          setHonorLoadError={setHonorLoadError}
          setHonorTitle={setHonorTitle}
          styles={styles}
        />

        <ProfileWalletSection
          loggedIn={loggedIn}
          balanceAmount={balanceAmount}
          luckyCoins={luckyCoins}
          couponCount={couponCount}
          refreshingBalance={refreshingBalance}
          balanceUpdatedAtText={balanceUpdatedAtText}
          checkedToday={checkedToday}
          checkInStreak={checkInStreak}
          guard={guard}
          onOpenBalanceLogs={onOpenBalanceLogs}
          onOpenFeature={onOpenFeature}
          styles={styles}
        />

        {referralError ? <ListErrorBanner message={referralError} onRetry={() => void refreshReferral()} /> : null}

        <ProfileHighlightsSection
          loggedIn={loggedIn}
          recentHighlights={recentHighlights}
          shareAchievements={shareAchievements}
          styles={styles}
        />

        <ProfilePrimaryToolsSection openPrimaryTool={openPrimaryTool} styles={styles} />

        <ProfileMoreToolsSection
          moreToolsExpanded={moreToolsExpanded}
          setMoreToolsExpanded={setMoreToolsExpanded}
          localVersionName={localVersion.versionName}
          appUpdateSupported={appUpdate.supported}
          appUpdatePhase={appUpdate.phase}
          showUpdateBadge={!!showUpdateBadge}
          handleCheckUpdate={handleCheckUpdate}
          orderBadges={orderBadges}
          orderTabCounts={orderTabCounts}
          referralStats={referralStats}
          moreGridItems={moreGridItems}
          appCellWidth={appCellWidth}
          setAppGridWidth={setAppGridWidth}
          guard={guard}
          onFilterOrders={onFilterOrders}
          onOpenFeature={onOpenFeature}
          openMoreItem={openMoreItem}
          couponCount={couponCount}
          styles={styles}
        />

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

      <ProfileEditModal
        visible={editVisible}
        nicknameDraft={nicknameDraft}
        avatarDraft={avatarDraft}
        savingNickname={savingNickname}
        authToken={authToken}
        screenStyles={screenStyles}
        setNicknameDraft={setNicknameDraft}
        setAvatarDraft={setAvatarDraft}
        setEditVisible={setEditVisible}
        setSavingNickname={setSavingNickname}
        onUpdateNickname={onUpdateNickname}
        onUpdateAvatar={onUpdateAvatar}
        styles={styles}
      />
    </View>
  );
}

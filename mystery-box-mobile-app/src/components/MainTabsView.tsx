import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import type { TabKey } from "./ui/BottomTabBar";
import { MainTabsSubPageContent } from "./mainTabs/MainTabsSubPageContent";
import { MainTabsTabContent } from "./mainTabs/MainTabsTabContent";
import { OnboardingFlow } from "./OnboardingFlow";
import {
  computeProfileTabBadge,
  isMainTabsSubPage,
  resolveMainTabsActiveTab,
} from "./mainTabs/mainTabsNavigation";
import { BottomTabBar } from "./ui/BottomTabBar";
import { AnalyticsQueueBanner } from "./ui/AnalyticsQueueBanner";
import { OfflineBanner } from "./ui/OfflineBanner";
import { ProductionEnvBanner } from "./ui/ProductionEnvBanner";
import { useOffline } from "../hooks/useOffline";
import { useMainTabsShellViewState } from "../hooks/useMainTabsViewSlices";
import { useAppStyles } from "../styles/appStyles";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import { trackEvent } from "../utils/analytics";
import { ANALYTICS_EVENTS } from "../utils/analyticsEvents";
import { hasUserPurchasedLocally } from "../utils/newcomerOffer";
import { consumeWarehouseCoachStep, shouldShowOnboardingCoach } from "../utils/onboardingCoachStorage";

export type { AppView } from "./mainTabs/appViews";
export type { MainTabsViewProps } from "./mainTabs/MainTabsViewModel";

export function MainTabsView() {
  const offline = useOffline();
  const { t } = useTranslation();
  const styles = useAppStyles();
  const localStyles = useThemedStyles(buildMainTabsLocalStyles);
  const [warehouseCoachVisible, setWarehouseCoachVisible] = useState(false);
  const {
    view,
    resetTab,
    globalErrors,
    onDismissGlobalError,
    onRetryFromError,
    unreadMessageCount,
    warehousePendingCount = 0,
    warehousePendingCountApproximate = false,
    onTabFocus,
    orderBadges,
    isLoggedIn,
  } = useMainTabsShellViewState();

  const isSubPage = isMainTabsSubPage(view);
  const activeTab = resolveMainTabsActiveTab(view);
  const messageBadge = unreadMessageCount ?? 0;
  const profileBadge = computeProfileTabBadge(messageBadge, orderBadges);

  const trackTabFocus = useCallback((tab: TabKey) => {
    trackEvent(ANALYTICS_EVENTS.TAB_FOCUS, { tab });
  }, []);

  const handleTabChange = useCallback(
    (tab: TabKey) => {
      resetTab(tab);
      onTabFocus?.(tab);
      trackTabFocus(tab);
    },
    [resetTab, onTabFocus, trackTabFocus],
  );

  useEffect(() => {
    if (!isSubPage && (view === "home" || view === "mall" || view === "warehouse" || view === "profile")) {
      onTabFocus?.(view);
      trackTabFocus(view);
    }
  }, [view, isSubPage, onTabFocus, trackTabFocus]);

  useEffect(() => {
    if (!isLoggedIn || isSubPage || view !== "warehouse") {
      setWarehouseCoachVisible(false);
      return;
    }
    void (async () => {
      if (await hasUserPurchasedLocally()) return;
      const pending = await consumeWarehouseCoachStep();
      if (!pending) return;
      const showCoach = await shouldShowOnboardingCoach(false);
      if (showCoach) setWarehouseCoachVisible(true);
    })();
  }, [view, isSubPage, isLoggedIn]);

  const content = isSubPage ? (
    <MainTabsSubPageContent offline={offline} />
  ) : (
    <MainTabsTabContent />
  );

  return (
    <View style={localStyles.root}>
      {offline ? <OfflineBanner onRetry={onRetryFromError} /> : null}
      <ProductionEnvBanner />
      <AnalyticsQueueBanner />
      {globalErrors.length > 0 ? (
        <View style={styles.errorBanner}>
          {globalErrors.map((message) => (
            <Text key={message} style={styles.errorBannerText}>
              {t("mainTabs.loadError", { message })}
            </Text>
          ))}
          <View style={styles.errorActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("mainTabs.retryA11y")}
              onPress={onRetryFromError}
            >
              <Text style={styles.errorActionText}>{t("mainTabs.retry")}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("mainTabs.dismissA11y")}
              onPress={onDismissGlobalError}
            >
              <Text style={styles.errorActionText}>{t("mainTabs.dismiss")}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={localStyles.body}>{content}</View>

      {!isSubPage ? (
        <BottomTabBar
          active={activeTab}
          onChange={handleTabChange}
          badges={{
            warehouse: {
              count: warehousePendingCount,
              approximate: warehousePendingCountApproximate,
            },
            profile: profileBadge,
          }}
        />
      ) : null}
      <OnboardingFlow
        visible={warehouseCoachVisible}
        mode="coach"
        initialStep={2}
        onDone={() => setWarehouseCoachVisible(false)}
      />
    </View>
  );
}

function buildMainTabsLocalStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgPage },
    body: { flex: 1 },
    loadMoreText: {
      textAlign: "center",
      color: colors.textMuted,
      paddingVertical: spacing.lg,
      fontSize: typography.caption,
      fontWeight: "600",
    },
  });
}

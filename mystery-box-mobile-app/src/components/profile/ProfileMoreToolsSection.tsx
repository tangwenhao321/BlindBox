import type { Dispatch, SetStateAction } from "react";
import { useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { FEATURE_KEYS } from "../../config/featureRegistry";
import { formatCurrency } from "../../utils/formatCurrency";
import { AnimatedRevealCard } from "../AnimatedRevealCard";
import { useAppTheme } from "../../context/ThemeContext";
import {
  FEATURE_SECTIONS,
  ORDER_SHORTCUTS,
  type GuidedFeatureSection,
  type MoreGridItem,
} from "./profileConstants";
import { ProfileGlyph } from "./ProfileGlyph";

type Props = {
  moreToolsExpanded: boolean;
  setMoreToolsExpanded: Dispatch<SetStateAction<boolean>>;
  localVersionName: string;
  appUpdateSupported: boolean;
  appUpdatePhase: string;
  showUpdateBadge: boolean;
  handleCheckUpdate: () => void;
  orderBadges: { pendingPay: number; pendingDelivery: number; pendingReceive: number; completed: number };
  orderTabCounts?: Record<string, number>;
  referralStats: { invitedCount?: number; totalCommission?: number } | null;
  moreGridItems: MoreGridItem[];
  appCellWidth: number;
  setAppGridWidth: Dispatch<SetStateAction<number>>;
  guard: (action: () => void) => void;
  onFilterOrders: (status: string) => void;
  onOpenFeature: (title: string) => void;
  openMoreItem: (item: MoreGridItem) => void;
  couponCount: number;
  styles: Record<string, object>;
};

function itemKey(item: MoreGridItem): string {
  return item.labelKey;
}

export function ProfileMoreToolsSection({
  moreToolsExpanded,
  setMoreToolsExpanded,
  localVersionName,
  appUpdateSupported,
  appUpdatePhase,
  showUpdateBadge,
  handleCheckUpdate,
  orderBadges,
  orderTabCounts,
  referralStats,
  moreGridItems,
  appCellWidth,
  setAppGridWidth,
  guard,
  onFilterOrders,
  onOpenFeature,
  openMoreItem,
  couponCount,
  styles,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();

  const visibleKeys = useMemo(() => new Set(moreGridItems.map(itemKey)), [moreGridItems]);

  const guidedSections = useMemo(() => {
    return FEATURE_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => visibleKeys.has(itemKey(item))),
    })).filter((section) => section.items.length > 0);
  }, [visibleKeys]);

  const renderGridItem = (item: MoreGridItem) => (
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
  );

  const renderSection = (section: GuidedFeatureSection & { items: MoreGridItem[] }) => (
    <View key={section.id} style={styles.guidedSection}>
      <Text style={styles.guidedSectionTitle} accessibilityRole="header">
        {t(section.titleKey)}
      </Text>
      <View style={styles.appGrid}>{section.items.map(renderGridItem)}</View>
    </View>
  );

  return (
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
            <Text style={styles.versionHint}>v{localVersionName}</Text>
            {appUpdateSupported ? (
              <Pressable
                style={({ pressed }) => [styles.checkUpdateBtn, pressed ? styles.checkUpdateBtnPressed : null]}
                accessibilityRole="button"
                accessibilityLabel={t("profile.checkUpdateA11y")}
                onPress={handleCheckUpdate}
                disabled={appUpdatePhase === "checking"}
              >
                <Text style={styles.checkUpdateText}>
                  {appUpdatePhase === "checking" ? t("profile.syncing") : t("profile.checkUpdate")}
                </Text>
                {showUpdateBadge ? <View style={styles.updateDot} /> : null}
              </Pressable>
            ) : null}
          </View>
        </View>
        {moreToolsExpanded ? (
          <>
            <Text style={styles.guidedSectionTitle} accessibilityRole="header">
              {t("profile.sectionOrders")}
            </Text>
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
            {referralStats?.invitedCount || referralStats?.totalCommission ? (
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
              onLayout={(event) => {
                const nextWidth = Math.round(event.nativeEvent.layout.width);
                setAppGridWidth((prev) => (prev === nextWidth ? prev : nextWidth));
              }}
            >
              {guidedSections.map(renderSection)}
            </View>
          </>
        ) : (
          <Text style={styles.moreToolsHint}>{t("profile.moreToolsHint")}</Text>
        )}
      </View>
    </AnimatedRevealCard>
  );
}

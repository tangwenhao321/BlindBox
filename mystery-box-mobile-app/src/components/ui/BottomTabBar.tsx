import { useEffect, useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { measureAnchor, useOnboardingAnchors } from "../../context/OnboardingAnchorContext";
import { useAppTheme } from "../../context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { shadows, spacing, typography } from "../../styles/tokens";

import { formatTabBadgeCount, resolveBadge, type TabBadges, type TabKey } from "./bottomTabBadge";

export type { TabKey } from "./bottomTabBadge";

type TabItem = {
  key: TabKey;
  icon: string;
};

type Props = {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  badges?: TabBadges;
};

const TAB_KEYS: TabKey[] = ["home", "mall", "warehouse", "profile"];

const TAB_ICONS: Record<TabKey, string> = {
  home: "⌂",
  mall: "🛍",
  warehouse: "▣",
  profile: "☺",
};

export function BottomTabBar({ active, onChange, badges }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const profileTabRef = useRef<View>(null);
  const warehouseTabRef = useRef<View>(null);
  const { setAnchor } = useOnboardingAnchors();

  useEffect(() => {
    const t = setTimeout(() => measureAnchor(warehouseTabRef, "warehouseTab", setAnchor), 500);
    return () => clearTimeout(t);
  }, [setAnchor]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        outer: {
          position: "absolute",
          left: spacing.md,
          right: spacing.md,
          bottom: spacing.sm,
          backgroundColor: colors.tabBarBg,
          borderRadius: 24,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          paddingBottom: spacing.xs,
          ...shadows.tabBar,
        },
        wrap: {
          flexDirection: "row",
          paddingTop: spacing.sm,
          paddingHorizontal: spacing.xs,
        },
        item: { flex: 1, alignItems: "center", gap: 4, paddingVertical: spacing.xs, position: "relative" },
        iconWrap: {
          width: 42,
          height: 42,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.bgSoft,
        },
        iconWrapActive: {
          width: 42,
          height: 42,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
        },
        icon: {
          fontSize: 20,
          color: colors.textMuted,
          fontWeight: "600",
        },
        iconActive: {
          color: colors.textOnBrand,
          fontWeight: "800",
        },
        label: {
          fontSize: typography.micro,
          color: colors.textMuted,
          fontWeight: "600",
        },
        labelActive: {
          color: colors.brand,
          fontWeight: "900",
        },
        badge: {
          position: "absolute",
          right: 14,
          top: 2,
          minWidth: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: colors.accent,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 3,
          borderWidth: 2,
          borderColor: colors.tabBarBg,
        },
        badgeText: { color: colors.textOnBrand, fontSize: 9, fontWeight: "800" },
      }),
    [colors],
  );

  return (
    <View style={[styles.outer, { bottom: spacing.sm + insets.bottom }]}>
      <View style={styles.wrap}>
        {TAB_KEYS.map((key) => {
          const tab = { key, icon: TAB_ICONS[key], label: t(`tabs.${key}`) };
          const isActive = active === tab.key;
          const badgeMeta = resolveBadge(badges?.[tab.key]);
          const badge = badgeMeta.count;
          const badgeLabel = formatTabBadgeCount(badge, badgeMeta.approximate);
          const isWarehouseTab = tab.key === "warehouse";
          const isProfileTab = tab.key === "profile";
          return (
            <Pressable
              key={tab.key}
              testID={`${tab.key}Tab`}
              ref={isWarehouseTab ? warehouseTabRef : isProfileTab ? profileTabRef : undefined}
              collapsable={isWarehouseTab || isProfileTab ? false : undefined}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={
                badge > 0
                  ? badgeMeta.approximate
                    ? t("tabs.badgeApproximate", { label: tab.label, count: badgeLabel })
                    : t("tabs.badgeUnread", { label: tab.label, count: badgeLabel })
                  : tab.label
              }
              style={styles.item}
              onPress={() => onChange(tab.key)}
            >
              {isActive ? (
                <LinearGradient colors={["#5B4DFF", "#8B5CF6"]} style={styles.iconWrapActive}>
                  <Text style={[styles.icon, styles.iconActive]}>{tab.icon}</Text>
                </LinearGradient>
              ) : (
                <View style={styles.iconWrap}>
                  <Text style={styles.icon}>{tab.icon}</Text>
                </View>
              )}
              <Text style={[styles.label, isActive ? styles.labelActive : null]}>{tab.label}</Text>
              {badge > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{badgeLabel}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

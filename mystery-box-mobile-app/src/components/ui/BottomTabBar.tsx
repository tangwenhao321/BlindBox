import { useEffect, useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { measureAnchor, useOnboardingAnchors } from "../../context/OnboardingAnchorContext";
import { useAppTheme } from "../../context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import { spacing, typography } from "../../styles/tokens";

import { formatTabBadgeCount, resolveBadge, type TabBadges, type TabKey } from "./bottomTabBadge";

export type { TabKey } from "./bottomTabBadge";

type Props = {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  badges?: TabBadges;
};

const TAB_KEYS: TabKey[] = ["home", "mall", "warehouse", "profile"];

function TabGlyph({
  tabKey,
  color,
  active,
  size = 22,
}: {
  tabKey: TabKey;
  color: string;
  active: boolean;
  size?: number;
}) {
  const a11y = { accessibilityElementsHidden: true as const, importantForAccessibility: "no-hide-descendants" as const };
  switch (tabKey) {
    case "home":
      return (
        <MaterialCommunityIcons
          name={active ? "lamp" : "lamp-outline"}
          size={size}
          color={color}
          {...a11y}
        />
      );
    case "mall":
      return (
        <MaterialCommunityIcons
          name={active ? "storefront" : "storefront-outline"}
          size={size}
          color={color}
          {...a11y}
        />
      );
    case "warehouse":
      return (
        <MaterialCommunityIcons
          name={active ? "treasure-chest" : "archive-outline"}
          size={size}
          color={color}
          {...a11y}
        />
      );
    case "profile":
      return (
        <MaterialCommunityIcons
          name={active ? "account-circle" : "account-circle-outline"}
          size={size}
          color={color}
          {...a11y}
        />
      );
    default:
      return null;
  }
}

export function BottomTabBar({ active, onChange, badges }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const profileTabRef = useRef<View>(null);
  const warehouseTabRef = useRef<View>(null);
  const { setAnchor } = useOnboardingAnchors();

  useEffect(() => {
    const t = setTimeout(() => {
      measureAnchor(warehouseTabRef, "warehouseTab", setAnchor);
      measureAnchor(profileTabRef, "profileTab", setAnchor);
    }, 500);
    return () => clearTimeout(t);
  }, [setAnchor]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        outer: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.tabBarBg,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
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
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, spacing.xs) }]}>
      <View style={styles.wrap}>
        {TAB_KEYS.map((key) => {
          const tab = { key, label: t(`tabs.${key}`) };
          const isActive = active === tab.key;
          const badgeMeta = resolveBadge(badges?.[tab.key]);
          const badge = badgeMeta.count;
          const badgeLabel = formatTabBadgeCount(badge, badgeMeta.approximate);
          const isWarehouseTab = tab.key === "warehouse";
          const isProfileTab = tab.key === "profile";
          const iconColor = isActive ? colors.textOnBrand : colors.textMuted;
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
              style={({ pressed }) => [styles.item, pressed ? { opacity: 0.9 } : null]}
              onPress={() => onChange(tab.key)}
            >
              {isActive ? (
                <LinearGradient colors={[colors.brand, colors.brandGradientEnd]} style={styles.iconWrapActive}>
                  <TabGlyph tabKey={tab.key} color={iconColor} active />
                </LinearGradient>
              ) : (
                <View style={styles.iconWrap}>
                  <TabGlyph tabKey={tab.key} color={iconColor} active={false} />
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

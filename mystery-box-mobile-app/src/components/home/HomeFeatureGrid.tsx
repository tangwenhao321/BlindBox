import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AppGradient } from "../ui/AppGradient";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { FEATURE_KEYS } from "../../config/featureRegistry";
import { radius, shadows, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";

type Tile = {
  titleKey: string;
  subtitleKey: string;
  colors: readonly [string, string];
  icon: string;
  feature?: string;
  action?: "mall";
  mallSearch?: string;
};

const PRIMARY: Tile[] = [
  { titleKey: "home.featureDaily", subtitleKey: "home.featureDailySub", colors: ["#FF8A3D", "#FFB347"], icon: "🎁", feature: FEATURE_KEYS.CHECK_IN },
  { titleKey: "home.featureBatch", subtitleKey: "home.featureBatchSub", colors: ["#EC4899", "#F472B6"], icon: "⚡", action: "mall" },
  { titleKey: "home.featureIp", subtitleKey: "home.featureIpSub", colors: ["#312E81", "#4338CA"], icon: "🎯", feature: FEATURE_KEYS.IP_THEME },
  { titleKey: "home.featureExchange", subtitleKey: "home.featureExchangeSub", colors: ["#10B981", "#34D399"], icon: "🛍", feature: FEATURE_KEYS.EXCHANGE_MALL },
];

const MORE: Tile[] = [
  { titleKey: "home.featureWeekly", subtitleKey: "home.featureWeeklySub", colors: ["#FF6B8A", "#FF8E53"], icon: "⏰", action: "mall", mallSearch: "限定" },
  { titleKey: "home.featureMonthly", subtitleKey: "home.featureMonthlySub", colors: ["#8B5CF6", "#6366F1"], icon: "🎉", feature: FEATURE_KEYS.PROMOTION },
  { titleKey: "home.featureInvite", subtitleKey: "home.featureInviteSub", colors: ["#F97316", "#FB923C"], icon: "🤝", feature: FEATURE_KEYS.INVITE_CENTER },
  { titleKey: "home.featureCommunity", subtitleKey: "home.featureCommunitySub", colors: ["#0EA5E9", "#38BDF8"], icon: "📣", feature: FEATURE_KEYS.COMMUNITY },
  { titleKey: "home.featureMarketplace", subtitleKey: "home.featureMarketplaceSub", colors: ["#F59E0B", "#FBBF24"], icon: "🏷", feature: FEATURE_KEYS.MARKETPLACE },
];

type Props = {
  onOpenFeature: (title: string) => void;
  onGoMall: () => void;
  onGoMallSearch?: (keyword: string) => void;
};

function TileCard({
  tile,
  onPress,
  styles,
  t,
}: {
  tile: Tile;
  onPress: () => void;
  styles: ReturnType<typeof buildFeatureGridStyles>;
  t: (key: string) => string;
}) {
  const title = t(tile.titleKey);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.tileOuter, pressed ? styles.pressed : null]}
    >
      <AppGradient colors={tile.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tile}>
        <Text style={styles.tileIcon}>{tile.icon}</Text>
        <Text style={styles.tileTitle}>{title}</Text>
        <Text style={styles.tileSub}>{t(tile.subtitleKey)}</Text>
        <Text style={styles.tileLink}>{t("home.featureViewDetails")}</Text>
      </AppGradient>
    </Pressable>
  );
}

export function HomeFeatureGrid({ onOpenFeature, onGoMall, onGoMallSearch }: Props) {
  const { t } = useTranslation();
  const [moreVisible, setMoreVisible] = useState(false);
  const styles = useThemedStyles(buildFeatureGridStyles);

  const openTile = (tile: Tile) => {
    if (tile.action === "mall") {
      onGoMall();
      if (tile.mallSearch) onGoMallSearch?.(tile.mallSearch);
    } else if (tile.feature) onOpenFeature(tile.feature);
    setMoreVisible(false);
  };

  return (
    <View style={styles.wrap}>
      {PRIMARY.map((tile) => (
        <TileCard key={tile.titleKey} tile={tile} onPress={() => openTile(tile)} styles={styles} t={t} />
      ))}
      <Pressable
        style={({ pressed }) => [styles.tileOuter, styles.moreTile, pressed ? styles.pressed : null]}
        onPress={() => setMoreVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={t("home.featureMore")}
      >
        <View style={styles.moreInner}>
          <Text style={styles.moreIcon}>⋯</Text>
          <Text style={styles.moreTitle}>{t("home.featureMore")}</Text>
          <Text style={styles.moreSub}>{t("home.featureMoreSub")}</Text>
        </View>
      </Pressable>

      <Modal visible={moreVisible} transparent animationType="fade" onRequestClose={() => setMoreVisible(false)}>
        <Pressable
          style={styles.moreMask}
          onPress={() => setMoreVisible(false)}
          accessibilityRole="button"
          accessibilityLabel={t("common.cancel")}
        >
          <View style={styles.moreSheet}>
            <Text style={styles.moreSheetTitle}>{t("home.featureMoreSheet")}</Text>
            <View style={styles.moreGrid}>
              {MORE.map((tile) => (
                <TileCard key={tile.titleKey} tile={tile} onPress={() => openTile(tile)} styles={styles} t={t} />
              ))}
            </View>
            <Pressable
              onPress={() => setMoreVisible(false)}
              accessibilityRole="button"
              accessibilityLabel={t("home.featureClose")}
            >
              <Text style={styles.moreClose}>{t("home.featureClose")}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function buildFeatureGridStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    tileOuter: {
      width: "48.5%",
      borderRadius: radius.md,
      overflow: "hidden",
      ...shadows.cardSm,
    },
    tile: {
      minHeight: 96,
      padding: spacing.md,
      justifyContent: "space-between",
    },
    tileIcon: { fontSize: 22, marginBottom: spacing.xs },
    tileTitle: { color: colors.textOnBrand, fontSize: typography.body, fontWeight: "900" },
    tileSub: { color: "rgba(255,255,255,0.82)", fontSize: typography.micro, fontWeight: "600", marginTop: 2 },
    tileLink: { marginTop: spacing.sm, color: "rgba(255,255,255,0.9)", fontSize: typography.micro, fontWeight: "700" },
    pressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
    moreTile: {
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 96,
      justifyContent: "center",
    },
    moreInner: { padding: spacing.md, alignItems: "center" },
    moreIcon: { fontSize: 28, color: colors.brand },
    moreTitle: { fontWeight: "900", color: colors.textPrimary, marginTop: spacing.xs },
    moreSub: { color: colors.textMuted, fontSize: typography.micro, marginTop: 2 },
    moreMask: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
    moreSheet: {
      backgroundColor: colors.bgPage,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.lg,
      maxHeight: "70%",
    },
    moreSheetTitle: { fontWeight: "900", fontSize: typography.h4, marginBottom: spacing.md, color: colors.textPrimary },
    moreGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
    moreClose: { textAlign: "center", marginTop: spacing.lg, color: colors.brand, fontWeight: "800" },
  });
}

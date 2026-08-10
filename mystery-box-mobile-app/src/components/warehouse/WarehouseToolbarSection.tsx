import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { layout, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";

type Props = {
  mainTab: "product" | "box";
  pendingOnly: boolean;
  itemCount: number;
  countApproximate?: boolean;
  selectMode: boolean;
  authToken?: string;
  onSelectMainTab: (tab: "product" | "box") => void;
  onTogglePendingOnly: () => void;
  onToggleSelectMode: () => void;
  onGoMarketplace?: () => void;
};

export function WarehouseToolbarSection({
  mainTab,
  pendingOnly,
  itemCount,
  countApproximate = false,
  selectMode,
  authToken,
  onSelectMainTab,
  onTogglePendingOnly,
  onToggleSelectMode,
  onGoMarketplace,
}: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildToolbarStyles);

  return (
    <>
      <View style={styles.mainTabs}>
        {(["product", "box"] as const).map((tab) => {
          const active = mainTab === tab;
          const label = tab === "product" ? t("warehouse.tabProduct") : t("warehouse.tabBox");
          return (
            <Pressable
              key={tab}
              onPress={() => onSelectMainTab(tab)}
              style={styles.mainTabBtn}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={label}
            >
              <Text style={[styles.mainTabText, active ? styles.mainTabActive : null]}>{label}</Text>
              {active ? <View style={styles.mainTabIndicator} /> : null}
            </Pressable>
          );
        })}
      </View>
      <View style={styles.filterRow}>
        <Pressable
          style={[styles.pendingTag, pendingOnly ? styles.pendingTagOn : null]}
          onPress={onTogglePendingOnly}
          accessibilityRole="button"
          accessibilityState={{ selected: pendingOnly }}
          accessibilityLabel={t("warehouse.filterPendingA11y")}
        >
          <Text style={[styles.pendingText, pendingOnly ? styles.pendingTextOn : null]}>
            {pendingOnly ? t("warehouse.filterPending") : t("warehouse.filterAll")}
          </Text>
        </Pressable>
        <Text style={styles.countHint}>
          {t("warehouse.itemCount", { count: countApproximate ? `~${itemCount}` : itemCount })}
        </Text>
        {countApproximate ? <Text style={styles.approxHint}>{t("warehouse.approximateCountHint")}</Text> : null}
        {mainTab === "product" && authToken ? (
          <Pressable
            onPress={onToggleSelectMode}
            accessibilityRole="button"
            accessibilityLabel={selectMode ? t("warehouse.batchCancelA11y") : t("warehouse.batchShipA11y")}
          >
            <Text style={styles.marketLink}>
              {selectMode ? t("warehouse.batchCancel") : t("warehouse.batchShip")}
            </Text>
          </Pressable>
        ) : null}
        {!selectMode && onGoMarketplace ? (
          <Pressable
            onPress={onGoMarketplace}
            accessibilityRole="button"
            accessibilityLabel={t("warehouse.goMarketplaceLinkA11y")}
          >
            <Text style={styles.marketLink}>{t("warehouse.goMarketplaceLink")}</Text>
          </Pressable>
        ) : null}
      </View>
      {mainTab === "box" ? (
        <Text style={styles.boxTabHint}>{t("warehouse.boxTabHint")}</Text>
      ) : null}
    </>
  );
}

function buildToolbarStyles(colors: ThemeColors) {
  return StyleSheet.create({
    mainTabs: {
      flexDirection: "row",
      justifyContent: "center",
      gap: spacing.xxl,
      paddingVertical: spacing.md,
      backgroundColor: colors.bgCard,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    mainTabBtn: { alignItems: "center", paddingHorizontal: spacing.sm, minWidth: 64 },
    mainTabText: { fontSize: typography.bodyLg, fontWeight: "700", color: colors.textSecondary },
    mainTabActive: { color: colors.brand, fontWeight: "900" },
    mainTabIndicator: {
      marginTop: spacing.xs,
      width: 24,
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.brand,
    },
    filterRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: layout.screenPaddingX,
      paddingVertical: spacing.sm,
      backgroundColor: colors.bgCard,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    pendingTag: {
      borderRadius: 999,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgSoft,
    },
    pendingTagOn: { backgroundColor: colors.brand, borderColor: colors.brand },
    pendingText: { fontSize: typography.caption, color: colors.textSecondary, fontWeight: "700" },
    pendingTextOn: { color: colors.textOnBrand },
    countHint: { fontSize: typography.caption, color: colors.textMuted },
    approxHint: {
      flexBasis: "100%",
      fontSize: typography.micro,
      color: colors.textMuted,
      lineHeight: 16,
      marginTop: spacing.xs,
      paddingHorizontal: layout.screenPaddingX,
    },
    boxTabHint: {
      paddingHorizontal: layout.screenPaddingX,
      paddingBottom: spacing.sm,
      fontSize: typography.caption,
      color: colors.textMuted,
      backgroundColor: colors.bgCard,
    },
    marketLink: { fontSize: typography.caption, color: colors.brand, fontWeight: "700" },
  });
}

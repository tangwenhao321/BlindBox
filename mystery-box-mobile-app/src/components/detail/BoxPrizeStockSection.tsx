import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { QualityBadge } from "../ui/QualityBadge";
import { radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
import type { PrizeStockLine } from "../../services/boxInsightService";

type Props = {
  prizeLines: PrizeStockLine[];
  onOpenProbability?: () => void;
  onOpenProbHelp: () => void;
};

export function BoxPrizeStockSection({ prizeLines, onOpenProbability, onOpenProbHelp }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildPrizeStockStyles);

  if (!prizeLines.length) return null;

  return (
    <>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{t("boxDetails.prizeStockTitle")}</Text>
        <Pressable
          onPress={() => {
            if (onOpenProbability) {
              onOpenProbability();
              return;
            }
            onOpenProbHelp();
          }}
          accessibilityRole="button"
          accessibilityLabel={t("boxDetails.probDisclosureLink")}
        >
          <Text style={styles.helpLink}>{t("boxDetails.probDisclosureLink")}</Text>
        </Pressable>
      </View>

      <View style={styles.stockTable}>
        <View style={styles.stockHeadRow}>
          <Text style={[styles.stockHeadCell, styles.stockNameCol]}>{t("boxDetails.colPrize")}</Text>
          <Text style={styles.stockHeadCell}>{t("boxDetails.colSold")}</Text>
        </View>
        {prizeLines.map((line) => (
          <View key={line.relId} style={[styles.stockRow, line.soldOut ? styles.stockRowSold : null]}>
            <View style={styles.stockNameCol}>
              <Text style={styles.stockName} numberOfLines={1}>
                {line.productName}
              </Text>
              <View style={styles.stockBadges}>
                <QualityBadge tier={line.qualityType} compact />
                {line.lastOne ? <Text style={styles.lastOneTag}>{t("boxDetails.lastOneTag")}</Text> : null}
                {line.soldOut ? <Text style={styles.soldOutTag}>{t("boxDetails.soldOutTag")}</Text> : null}
              </View>
            </View>
            <Text style={styles.stockCount}>
              {Math.max(0, line.stockTotal - line.stockRemaining)}/{line.stockTotal}
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}

function buildPrizeStockStyles(colors: ThemeColors) {
  return StyleSheet.create({
    sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
    sectionTitle: { fontSize: typography.bodyLg, fontWeight: "800", color: colors.textPrimary },
    helpLink: { color: colors.link, fontWeight: "700", fontSize: typography.caption },
    stockTable: {
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.md,
      overflow: "hidden",
    },
    stockHeadRow: {
      flexDirection: "row",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.bgSoft,
    },
    stockHeadCell: { fontWeight: "800", fontSize: typography.caption, color: colors.textSecondary },
    stockRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    stockRowSold: { opacity: 0.55 },
    stockNameCol: { flex: 1, paddingRight: spacing.sm },
    stockName: { fontWeight: "700", color: colors.textPrimary },
    stockBadges: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
    lastOneTag: {
      fontSize: typography.micro,
      color: colors.brand,
      fontWeight: "900",
      backgroundColor: colors.bgBrandSoft,
      paddingHorizontal: 6,
      borderRadius: 4,
    },
    soldOutTag: { fontSize: typography.micro, color: colors.textMuted, fontWeight: "700" },
    stockCount: { fontWeight: "800", color: colors.brand, minWidth: 72, textAlign: "right" },
  });
}

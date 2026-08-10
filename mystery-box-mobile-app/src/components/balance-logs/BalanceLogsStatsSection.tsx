import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useScreenStyles } from "../../styles/screenStyles";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
import { formatCurrency } from "../../utils/formatCurrency";

type Props = {
  filteredCount: number;
  sortMode: "TIME_DESC" | "AMOUNT_DESC";
  onToggleSort: () => void;
  onClearFilters: () => void;
  onResetDefault: () => void;
  onShareSummary: () => void;
  onExportCsv: () => void;
  total: number;
  avg: number;
  max: number;
  currentMonthCount: number;
  currentMonthTotal: number;
  prevMonthCount: number;
  prevMonthTotal: number;
  amountPct: number;
  countPct: number;
  formatDelta: (value: number) => string;
  lastExportInfo: string;
  filterSummary: string;
};

export function BalanceLogsStatsSection(props: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildBalanceStatsStyles);
  const screenStyles = useScreenStyles();
  const {
    filteredCount,
    sortMode,
    onToggleSort,
    onClearFilters,
    onResetDefault,
    onShareSummary,
    onExportCsv,
    total,
    avg,
    max,
    currentMonthCount,
    currentMonthTotal,
    prevMonthCount,
    prevMonthTotal,
    amountPct,
    countPct,
    formatDelta,
    lastExportInfo,
    filterSummary,
  } = props;

  return (
    <>
      <View style={screenStyles.screenCard}>
        <Text style={styles.hint}>{t("balanceLogs.currentCount", { count: filteredCount })}</Text>
        <View style={styles.actionsWrap}>
          <Pressable
            style={screenStyles.chipBtn}
            accessibilityRole="button"
            accessibilityLabel={sortMode === "TIME_DESC" ? t("balanceLogs.sortTimeDesc") : t("balanceLogs.sortAmountDesc")}
            onPress={onToggleSort}
          >
            <Text style={screenStyles.chipText}>
              {sortMode === "TIME_DESC" ? t("balanceLogs.sortTimeDesc") : t("balanceLogs.sortAmountDesc")}
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t("balanceLogs.clearFilters")} onPress={onClearFilters}>
            <Text style={styles.actionLink}>{t("balanceLogs.clearFilters")}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t("balanceLogs.resetDefaultLink")} onPress={onResetDefault}>
            <Text style={styles.actionLink}>{t("balanceLogs.resetDefaultLink")}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t("balanceLogs.shareSummary")} onPress={onShareSummary}>
            <Text style={styles.actionLink}>{t("balanceLogs.shareSummary")}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={t("balanceLogs.exportCsv")} onPress={onExportCsv}>
            <Text style={styles.actionLink}>{t("balanceLogs.exportCsv")}</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.statsCard}>
        <Text style={screenStyles.sectionTitle}>{t("balanceLogs.statsTitle")}</Text>
        <Text style={styles.statsText}>{t("balanceLogs.statsTotal", { amount: formatCurrency(total) })}</Text>
        <Text style={styles.statsText}>{t("balanceLogs.statsAvg", { amount: formatCurrency(avg) })}</Text>
        <Text style={styles.statsText}>{t("balanceLogs.statsMax", { amount: formatCurrency(max) })}</Text>
      </View>
      <View style={styles.monthCard}>
        <Text style={styles.monthTitle}>{t("balanceLogs.monthTitle")}</Text>
        <Text style={styles.monthText}>
          {t("balanceLogs.monthCurrent", { count: currentMonthCount, amount: formatCurrency(currentMonthTotal) })}
        </Text>
        <Text style={styles.monthText}>
          {t("balanceLogs.monthPrev", { count: prevMonthCount, amount: formatCurrency(prevMonthTotal) })}
        </Text>
        <Text style={[styles.monthDelta, amountPct >= 0 ? styles.deltaUp : styles.deltaDown]}>
          {t("balanceLogs.monthAmountDelta", { delta: formatDelta(amountPct) })}
        </Text>
        <Text style={[styles.monthDelta, countPct >= 0 ? styles.deltaUp : styles.deltaDown]}>
          {t("balanceLogs.monthCountDelta", { delta: formatDelta(countPct) })}
        </Text>
      </View>
      {lastExportInfo ? <Text style={styles.exportMeta}>{lastExportInfo}</Text> : null}
      <Text style={styles.summaryText}>{filterSummary}</Text>
    </>
  );
}

function buildBalanceStatsStyles(colors: ThemeColors) {
  return StyleSheet.create({
    actionsWrap: { flexDirection: "row", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 8 },
    actionLink: { color: colors.link, fontWeight: "700" },
    hint: { marginTop: 4, color: colors.textSecondary },
    statsCard: {
      backgroundColor: colors.violetPanel,
      borderWidth: 1,
      borderColor: colors.violetPanelBorder,
      borderRadius: radius.sm,
      padding: spacing.md,
      marginBottom: spacing.md,
      gap: 4,
    },
    statsText: { color: colors.violetTextStrong, fontWeight: "700", fontSize: typography.caption },
    monthCard: {
      backgroundColor: colors.successSoft,
      borderWidth: 1,
      borderColor: colors.successSoftBorder,
      borderRadius: radius.sm,
      padding: spacing.md,
      marginBottom: spacing.md,
      gap: 4,
    },
    monthTitle: { color: colors.successStrong, fontWeight: "800", fontSize: 13 },
    monthText: { color: colors.successText, fontSize: typography.caption, fontWeight: "700" },
    monthDelta: { fontSize: typography.caption, fontWeight: "800" },
    deltaUp: { color: colors.success },
    deltaDown: { color: colors.warning },
    exportMeta: { color: colors.brandText, marginBottom: spacing.md, fontSize: typography.caption },
    summaryText: { color: colors.textSummary, fontSize: typography.caption, marginBottom: spacing.md },
  });
}

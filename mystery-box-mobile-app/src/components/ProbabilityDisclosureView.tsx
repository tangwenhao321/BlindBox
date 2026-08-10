import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { SubPageHeader } from "./ui/SubPageHeader";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { ListSkeleton } from "./ListSkeleton";
import { shouldShowListSkeleton } from "./ui/listScreenHelpers";
import { useAuthToken } from "../hooks/useAuthToken";
import { useListLoad } from "../hooks/useListLoad";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { layout, radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import {
  fetchBoxProbability,
  fetchProbabilityHistory,
  rateToPercent,
  type ProbabilityHistoryItem,
} from "../services/probabilityService";
import { fetchTrustMeta } from "../services/trustMetaService";
import { TrustComplianceStrip } from "./detail/TrustComplianceStrip";
import type { MysteryBox } from "../types";

type Props = {
  box: MysteryBox;
  onBack: () => void;
};

export function ProbabilityDisclosureView({ box, onBack }: Props) {
  const authToken = useAuthToken();
  const { t } = useTranslation();
  const styles = useThemedStyles(buildProbabilityStyles);
  const [updatedAt, setUpdatedAt] = useState("");
  const [rates, setRates] = useState({ legendary: "0%", hidden: "0%", general: "0%" });
  const [history, setHistory] = useState<ProbabilityHistoryItem[]>([]);
  const [trustMeta, setTrustMeta] = useState<Awaited<ReturnType<typeof fetchTrustMeta>>>(null);
  const [hasRates, setHasRates] = useState(false);
  const { loadError, loading, runLoad } = useListLoad();

  const reload = useCallback(async () => {
    await runLoad(async () => {
      const [data, hist, trust] = await Promise.all([
        fetchBoxProbability(box.id),
        fetchProbabilityHistory(box.id, 10),
        fetchTrustMeta(authToken, box.id),
      ]);
      if (!data) {
        throw new Error(t("probability.noConfig"));
      }
      setRates({
        legendary: rateToPercent(data.legendaryRate),
        hidden: rateToPercent(data.hiddenRate),
        general: rateToPercent(data.generalRate),
      });
      setUpdatedAt(data.updatedAt || "");
      setHasRates(true);
      setHistory(hist);
      setTrustMeta(trust);
    });
  }, [authToken, box.id, runLoad, t]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const showSkeleton = shouldShowListSkeleton(loading, hasRates ? 1 : 0, loadError);

  return (
    <View style={styles.page}>
      <SubPageHeader title={t("probability.title")} onBack={onBack} />
      {loadError ? <ListErrorBanner message={loadError} onRetry={() => void reload()} /> : null}
      {showSkeleton ? (
        <ListSkeleton rows={3} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.boxName}>{box.name}</Text>
          <TrustComplianceStrip meta={trustMeta} />
          <View style={styles.card}>
            <Text style={styles.row}>{t("probability.legendary", { rate: rates.legendary })}</Text>
            <Text style={styles.row}>{t("probability.hidden", { rate: rates.hidden })}</Text>
            <Text style={styles.row}>{t("probability.general", { rate: rates.general })}</Text>
          </View>
          {updatedAt ? <Text style={styles.meta}>{t("probability.updatedAt", { time: updatedAt })}</Text> : null}
          {history.length ? (
            <View style={styles.historyBlock}>
              <Text style={styles.historyTitle}>{t("probability.historyTitle")}</Text>
              {history.map((item, index) => (
                <Text key={`${item.effectiveTime}-${index}`} style={styles.historyRow}>
                  {t("probability.historyRow", {
                    time: item.effectiveTime,
                    legendary: rateToPercent(item.legendaryRate),
                    hidden: rateToPercent(item.hiddenRate),
                    general: rateToPercent(item.generalRate),
                  })}
                </Text>
              ))}
            </View>
          ) : null}
          <Text style={styles.disclaimer}>{t("probability.disclaimer")}</Text>
        </ScrollView>
      )}
    </View>
  );
}

function buildProbabilityStyles(colors: ThemeColors) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.bgPage },
    content: { padding: layout.screenPaddingX, paddingBottom: spacing.xxl },
    boxName: { fontSize: typography.h3, fontWeight: "900", marginBottom: spacing.md, color: colors.textPrimary },
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    row: { fontSize: typography.body, fontWeight: "700", color: colors.textPrimary },
    meta: { marginTop: spacing.md, color: colors.textMuted, fontSize: typography.caption },
    historyBlock: { marginTop: spacing.lg, gap: spacing.xs },
    historyTitle: { fontWeight: "800", fontSize: typography.body, color: colors.textPrimary },
    historyRow: { color: colors.textSecondary, fontSize: typography.caption, lineHeight: 18 },
    disclaimer: { marginTop: spacing.lg, color: colors.textSecondary, lineHeight: 20, fontSize: typography.caption },
  });
}

import { useCallback, useEffect, useState } from "react";
import { Clipboard, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ListSkeleton } from "./ListSkeleton";
import { SubPageHeader } from "./ui/SubPageHeader";
import { InlineSectionError } from "./ui/InlineSectionError";
import { openContactSupport } from "../utils/contactSupport";
import { EmptyState } from "./EmptyState";
import { SeriesDrawStatisticsSection } from "./SeriesDrawStatisticsSection";
import { useListLoad } from "../hooks/useListLoad";
import {
  fetchSeriesDrawStatistics,
  verifyFairnessByOrder,
  type FairnessVerifyResult,
  type SeriesDrawStatistics,
} from "../services/fairnessService";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { layout, radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import { toast } from "../utils/toast";

function buildVerifyText(
  t: (key: string, opts?: Record<string, unknown>) => string,
  orderId: string,
  rows: FairnessVerifyResult[],
) {
  const body = rows
    .map(
      (r) =>
        `${r.productName} seed=${r.fairnessSeed} hash=${r.fairnessHash} ${r.verified ? "OK" : "FAIL"}`,
    )
    .join("\n");
  return `${t("fairness.verifyHeader", { orderId })}\n${body}`;
}

type Props = {
  orderId: string;
  mysteryBoxId?: string;
  onBack: () => void;
  missingOrder?: boolean;
};

export function FairnessVerifyView({ orderId, mysteryBoxId, onBack, missingOrder = false }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildFairnessVerifyStyles);
  const [rows, setRows] = useState<FairnessVerifyResult[]>([]);
  const [seriesStats, setSeriesStats] = useState<SeriesDrawStatistics | null>(null);
  const { loadError, loading, runLoad } = useListLoad();

  const reload = useCallback(async () => {
    if (!orderId) return;
    await runLoad(async () => {
      const data = await verifyFairnessByOrder(orderId);
      setRows(data);
    });
  }, [orderId, runLoad]);

  useEffect(() => {
    if (missingOrder || !orderId) return;
    void reload();
  }, [reload, missingOrder, orderId]);

  useEffect(() => {
    if (!mysteryBoxId) return;
    void fetchSeriesDrawStatistics(mysteryBoxId)
      .then(setSeriesStats)
      .catch(() => setSeriesStats(null));
  }, [mysteryBoxId]);

  return (
    <View style={styles.root}>
      <SubPageHeader title={t("fairness.title")} onBack={onBack} />
      {!loading && !loadError && rows.length > 0 ? (
        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("fairness.copyResult")}
            style={styles.shareBtn}
            onPress={() => {
              Clipboard.setString(buildVerifyText(t, orderId, rows));
              toast.success(t("fairness.copied"));
            }}
          >
            <Text style={styles.shareText}>{t("fairness.copyResult")}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("fairness.shareResult")}
            style={styles.shareBtn}
            onPress={() => {
              void Share.share({ message: buildVerifyText(t, orderId, rows) });
            }}
          >
            <Text style={styles.shareText}>{t("fairness.shareResult")}</Text>
          </Pressable>
        </View>
      ) : null}
      {missingOrder || !orderId ? (
        <EmptyState
          title={t("fairness.missingOrderTitle")}
          description={t("fairness.missingOrderDesc")}
          variant="plain"
        />
      ) : loading ? (
        <ListSkeleton variant="row" rows={3} />
      ) : loadError ? (
        <View style={{ paddingHorizontal: layout.screenPaddingX, paddingTop: spacing.sm }}>
          <InlineSectionError
            message={loadError}
            onRetry={() => void reload()}
            onContactSupport={() => void openContactSupport()}
          />
        </View>
      ) : rows.length === 0 ? (
        <EmptyState title={t("fairness.emptyTitle")} description={t("fairness.emptyDesc")} variant="plain" />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {seriesStats ? <SeriesDrawStatisticsSection stats={seriesStats} compact /> : null}
          <Text style={styles.hint}>{t("fairness.hint")}</Text>
          {rows.map((row) => (
            <View key={row.drawLogId} style={styles.card}>
              <Text style={styles.prize}>{row.productName}</Text>
              <Text style={styles.line}>{t("fairness.quality", { type: row.qualityType })}</Text>
              <Text style={styles.line} selectable>
                seed {row.fairnessSeed}
              </Text>
              <Text style={styles.line} selectable>
                hash {row.fairnessHash}
              </Text>
              <Text style={[styles.badge, row.verified ? styles.ok : styles.bad]}>
                {row.verified ? t("fairness.verifiedOk") : t("fairness.verifiedBad")}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function buildFairnessVerifyStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgPage },
    scroll: { padding: layout.screenPaddingX, paddingBottom: spacing.xxl, gap: spacing.sm },
    hint: { color: colors.textSecondary, fontSize: typography.caption, marginBottom: spacing.md },
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      padding: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      gap: 4,
    },
    prize: { fontWeight: "800", color: colors.textPrimary },
    line: { fontSize: typography.caption, color: colors.textSecondary },
    badge: { marginTop: spacing.xs, fontWeight: "800", fontSize: typography.caption },
    ok: { color: colors.success },
    bad: { color: colors.danger },
    shareBtn: { flex: 1, marginBottom: spacing.sm },
    actionRow: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: layout.screenPaddingX, paddingTop: spacing.sm },
    shareText: { color: colors.brand, fontWeight: "700", textAlign: "center" },
  });
}

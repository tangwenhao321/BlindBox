import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { fetchDailyBeacon, type FairnessDailyBeacon } from "../services/fairnessService";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";

type Props = {
  /** Compact single-line trust row (checkout / strip). */
  compact?: boolean;
  onOpenProbability?: () => void;
};

function shortBeacon(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 10) return trimmed;
  return `${trimmed.slice(0, 8)}…`;
}

/** Surfaces daily fairness beacon + optional probability link near checkout / box details. */
export function FairnessTrustRow({ compact = true, onOpenProbability }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildFairnessTrustStyles);
  const [beacon, setBeacon] = useState<FairnessDailyBeacon | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchDailyBeacon()
      .then((next) => {
        if (!cancelled) setBeacon(next);
      })
      .catch(() => {
        if (!cancelled) setBeacon(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!beacon && !onOpenProbability) return null;

  return (
    <View
      style={[styles.row, compact ? styles.rowCompact : null]}
      accessibilityRole="summary"
      accessibilityLabel={
        beacon
          ? t("fairness.dailyBeaconA11y", { day: beacon.dayUtc, short: shortBeacon(beacon.beacon) })
          : t("fairness.dailyBeaconUnavailable")
      }
    >
      <View style={styles.textCol}>
        <Text style={styles.title} numberOfLines={1}>
          {t("fairness.dailyBeaconTitle")}
        </Text>
        {beacon ? (
          <Text style={styles.meta} numberOfLines={1}>
            {t("fairness.dailyBeaconLine", {
              day: beacon.dayUtc,
              short: shortBeacon(beacon.beacon),
            })}
          </Text>
        ) : (
          <Text style={styles.meta} numberOfLines={1}>
            {t("fairness.dailyBeaconUnavailable")}
          </Text>
        )}
      </View>
      {onOpenProbability ? (
        <Pressable
          onPress={onOpenProbability}
          accessibilityRole="button"
          accessibilityLabel={t("fairness.viewProbability")}
          hitSlop={8}
        >
          <Text style={styles.link}>{t("fairness.viewProbability")}</Text>
        </Pressable>
      ) : (
        <Text style={styles.proof}>{t("fairness.dailyBeaconProof")}</Text>
      )}
    </View>
  );
}

function buildFairnessTrustStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.xs,
    },
    rowCompact: {
      paddingVertical: spacing.xs,
    },
    textCol: { flex: 1, minWidth: 0 },
    title: {
      fontSize: typography.micro,
      fontWeight: "700",
      color: colors.textSecondary,
    },
    meta: {
      marginTop: 2,
      fontSize: typography.micro,
      color: colors.textMuted,
    },
    link: {
      fontSize: typography.micro,
      fontWeight: "700",
      color: colors.brand,
    },
    proof: {
      fontSize: typography.micro,
      fontWeight: "600",
      color: colors.textMuted,
    },
  });
}

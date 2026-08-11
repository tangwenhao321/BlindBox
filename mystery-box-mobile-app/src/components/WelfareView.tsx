import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { parseError } from "../api";
import { checkIn, getCheckInStatus } from "../services/welfareService";
import { useAuthToken } from "../hooks/useAuthToken";
import { useAppTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { toast } from "../utils/toast";
import { trackEvent } from "../utils/analytics";
import { AppGradient } from "./ui/AppGradient";
import { PrimaryButton } from "./ui/PrimaryButton";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { ListSkeleton } from "./ListSkeleton";
import { font, layout, radius, shadows, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import { AnimatedRevealCard } from "./AnimatedRevealCard";

type Props = {
  onOpenCoupons: () => void;
};

export function WelfareView({ onOpenCoupons }: Props) {
  const token = useAuthToken();
  const { t } = useTranslation();
  const { colors: themeColors } = useAppTheme();
  const styles = useThemedStyles(buildWelfareStyles);
  const [status, setStatus] = useState<import("../services/welfareService").CheckInStatus>({
    checkedToday: false,
    luckyCoins: 0,
    starStones: 0,
    todayRewardCoins: 10,
    streakDays: 0,
    weekCalendar: [],
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const next = await getCheckInStatus(token);
      setStatus(next);
    } catch (err) {
      setError(parseError(err));
    } finally {
      setInitialLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <View style={styles.root}>
      {error ? <ListErrorBanner message={error} onRetry={() => void refresh()} /> : null}
      {initialLoading && !error ? (
        <ListSkeleton rows={3} />
      ) : error ? null : (
        <>
          <AnimatedRevealCard delay={0}>
            <AppGradient
              colors={[themeColors.bgPage, themeColors.bgBrandSoft, themeColors.brandDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <Text style={styles.heroTitle}>{t("welfare.heroTitle")}</Text>
              <Text style={styles.heroSub}>{t("welfare.heroSub")}</Text>
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{status.luckyCoins}</Text>
                  <Text style={styles.statLabel}>{t("profile.luckyCoins")}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{status.streakDays ?? 0}</Text>
                  <Text style={styles.statLabel}>{t("welfare.lanternDaysLabel")}</Text>
                </View>
              </View>
            </AppGradient>
          </AnimatedRevealCard>
          <AnimatedRevealCard delay={60}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t("welfare.dailyCheckIn")}</Text>
              <Text style={styles.meta}>
                {t("welfare.streakMeta", {
                  days: status.streakDays ?? 0,
                  coins: status.todayRewardCoins,
                })}
              </Text>
              <View style={styles.weekRow}>
                {(status.weekCalendar ?? []).map((day) => (
                  <View key={day.date} style={[styles.dayCell, day.checked ? styles.dayChecked : null]}>
                    <Text style={styles.dayText}>{day.date.slice(5)}</Text>
                    <Text style={styles.dayMark}>{day.checked ? "✓" : "·"}</Text>
                  </View>
                ))}
              </View>
              <PrimaryButton
                testID="welfareCheckInButton"
                label={status.checkedToday ? t("welfare.checkInDone") : t("welfare.checkInToday")}
                accessibilityLabel={status.checkedToday ? t("welfare.checkInDone") : t("welfare.checkInToday")}
                disabled={status.checkedToday || loading}
                loading={loading}
                onPress={async () => {
                  setLoading(true);
                  try {
                    const next = await checkIn(token);
                    setStatus(next);
                    trackEvent("check_in", { streakDays: next.streakDays, reward: next.todayRewardCoins });
                    toast.success(t("welfare.checkInSuccess", { coins: next.todayRewardCoins }));
                  } catch (err) {
                    toast.error(parseError(err));
                  } finally {
                    setLoading(false);
                  }
                }}
                style={styles.checkBtn}
              />
            </View>
          </AnimatedRevealCard>
          <AnimatedRevealCard delay={120}>
            <Pressable
              style={styles.linkCard}
              onPress={onOpenCoupons}
              accessibilityRole="button"
              accessibilityLabel={t("welfare.openCoupons")}
            >
              <Text style={styles.linkText}>{t("welfare.openCoupons")} →</Text>
            </Pressable>
          </AnimatedRevealCard>
        </>
      )}
    </View>
  );
}

function buildWelfareStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgPage, padding: layout.screenPaddingX, paddingTop: spacing.md },
    error: { color: colors.danger, marginBottom: spacing.sm, fontSize: typography.caption },
    hero: {
      borderRadius: radius.xl,
      padding: spacing.xl,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.profileHeroGlassBorder,
      ...shadows.card,
    },
    heroTitle: {
      ...font("bodySemiBold"),
      color: colors.brandText,
      fontSize: typography.h3,
      marginBottom: spacing.xs,
    },
    heroSub: {
      ...font("body"),
      color: colors.profileHeroSubtext,
      fontSize: typography.caption,
      lineHeight: 18,
      marginBottom: spacing.lg,
    },
    statsRow: { flexDirection: "row", alignItems: "center" },
    stat: { flex: 1, alignItems: "center" },
    statValue: {
      ...font("numeral"),
      color: colors.textPrimary,
      fontSize: typography.h2,
      fontWeight: "900",
    },
    statLabel: { color: colors.profileHeroSubtext, fontSize: typography.caption, marginTop: 4 },
    statDivider: { width: 1, height: 36, backgroundColor: colors.profileHeroGlassBorder },
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      ...shadows.cardSm,
    },
    cardTitle: { fontWeight: "800", fontSize: typography.bodyLg, color: colors.textPrimary },
    meta: { marginTop: spacing.xs, color: colors.textSecondary, fontSize: typography.caption, lineHeight: 18 },
    checkBtn: { marginTop: spacing.md },
    weekRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.md, marginBottom: spacing.sm },
    dayCell: {
      alignItems: "center",
      padding: spacing.xs,
      borderRadius: radius.sm,
      backgroundColor: colors.bgSoft,
      minWidth: 40,
    },
    dayChecked: { backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.chipBorder },
    dayText: { fontSize: 10, color: colors.textSecondary },
    dayMark: { fontWeight: "700", color: colors.brand },
    linkCard: {
      paddingVertical: spacing.lg,
      alignItems: "center",
      backgroundColor: colors.bgBrandSoft,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.chipBorder,
    },
    linkText: { color: colors.brand, fontWeight: "800", fontSize: typography.body },
  });
}

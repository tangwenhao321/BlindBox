import { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { fetchCurrentVip } from "../services/vipService";
import { getCheckInStatus } from "../services/welfareService";
import { computeMemberLevelProgress } from "../utils/memberLevel";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { SubPageHeader } from "./ui/SubPageHeader";
import { ScreenScaffold } from "./ui/ScreenScaffold";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { ListSkeleton } from "./ListSkeleton";
import { shouldShowListSkeleton } from "./ui/listScreenHelpers";
import { useAuthToken } from "../hooks/useAuthToken";
import { useListLoad } from "../hooks/useListLoad";
import { layout, radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";

type Props = {
  onBack: () => void;
};

const BENEFIT_KEYS = ["vip.benefit1", "vip.benefit2", "vip.benefit3", "vip.benefit4"] as const;

export function VipBenefitsView({ onBack }: Props) {
  const token = useAuthToken();
  const { t } = useTranslation();
  const styles = useThemedStyles(buildVipStyles);
  const [endTime, setEndTime] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [luckyCoins, setLuckyCoins] = useState(0);
  const [checkedToday, setCheckedToday] = useState(false);
  const { loadError, loading, runLoad } = useListLoad();
  const levelProgress = computeMemberLevelProgress(luckyCoins);

  const reload = useCallback(async () => {
    await runLoad(async () => {
      const [vip, checkIn] = await Promise.all([fetchCurrentVip(token), getCheckInStatus(token)]);
      setEndTime(vip?.endTime ?? null);
      setLuckyCoins(checkIn.luckyCoins);
      setCheckedToday(checkIn.checkedToday);
      setLoaded(true);
    });
  }, [token, runLoad]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const active = endTime ? new Date(endTime).getTime() > Date.now() : false;
  const showSkeleton = shouldShowListSkeleton(loading, loaded ? 1 : 0, loadError);

  const progressLine = useMemo(() => {
    const base =
      levelProgress.nextLevelAt != null
        ? t("vip.upgradeHint", {
            count: Math.max(0, levelProgress.nextLevelAt - levelProgress.currentPoints),
          })
        : t("vip.maxLevel");
    return base + (checkedToday ? t("vip.checkedTodaySuffix") : t("vip.checkInPendingSuffix"));
  }, [levelProgress, checkedToday, t]);

  return (
    <View style={styles.root}>
      <SubPageHeader title={t("vip.title")} onBack={onBack} />
      <ScreenScaffold contentContainerStyle={styles.content}>
        {loadError ? <ListErrorBanner message={loadError} onRetry={() => void reload()} /> : null}
        {showSkeleton ? (
          <ListSkeleton rows={2} />
        ) : (
          <>
            <View style={styles.hero}>
              <Text style={styles.heroLabel}>{active ? t("vip.vipActive") : t("vip.regularUser")}</Text>
              <Text style={styles.heroTitle}>
                {t("vip.levelTitle", { level: levelProgress.level, title: levelProgress.title })}
              </Text>
              <View style={styles.levelBarTrack}>
                <View style={[styles.levelBarFill, { width: `${Math.round(levelProgress.progress * 100)}%` }]} />
              </View>
              <Text style={styles.heroMeta}>{progressLine}</Text>
              {endTime ? (
                <Text style={styles.heroMeta}>
                  {t("vip.vipUntil", { time: endTime.replace("T", " ").slice(0, 16) })}
                </Text>
              ) : (
                <Text style={styles.heroMeta}>{t("vip.noVip")}</Text>
              )}
            </View>
            <Text style={styles.sectionTitle}>{t("vip.benefitsTitle")}</Text>
            {BENEFIT_KEYS.map((key) => (
              <View key={key} style={styles.row}>
                <Text style={styles.bullet}>✦</Text>
                <Text style={styles.rowText}>{t(key)}</Text>
              </View>
            ))}
          </>
        )}
        <Text style={styles.legal}>{t("vip.legal")}</Text>
      </ScreenScaffold>
    </View>
  );
}

function buildVipStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgPage },
    content: { paddingBottom: layout.screenPaddingBottom, gap: spacing.md },
    hero: {
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.violetPanelBorder,
    },
    heroLabel: { color: colors.brand, fontWeight: "800", fontSize: typography.caption },
    heroTitle: { marginTop: spacing.xs, fontSize: typography.h3, fontWeight: "900", color: colors.textPrimary },
    heroMeta: { marginTop: spacing.sm, color: colors.textMuted, fontSize: typography.caption, lineHeight: 20 },
    levelBarTrack: {
      marginTop: spacing.sm,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.bgSoft,
      overflow: "hidden",
    },
    levelBarFill: { height: "100%", backgroundColor: colors.brand, borderRadius: 4 },
    sectionTitle: { fontWeight: "900", fontSize: typography.bodyLg, color: colors.textPrimary },
    row: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
    bullet: { color: colors.brand, fontWeight: "900" },
    rowText: { flex: 1, color: colors.textSecondary, lineHeight: 22 },
    legal: { marginTop: spacing.md, color: colors.textMuted, fontSize: typography.micro, lineHeight: 18 },
  });
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { OptimizedFlatList } from "./ui/OptimizedFlatList";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { ListSkeleton } from "./ListSkeleton";
import { shouldShowListSkeleton } from "./ui/listScreenHelpers";
import { useListLoad } from "../hooks/useListLoad";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { SubPageHeader } from "./ui/SubPageHeader";
import { RemoteImage } from "./ui/RemoteImage";
import { layout, radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import {
  fetchActivityDetail,
  type MysteryBoxActivity,
  type ActivityBoxSummary,
} from "../services/activityService";
import type { MysteryBox } from "../types";
import { formatCurrency } from "../utils/formatCurrency";
import { resolveBoxImageUrl } from "../utils/boxImage";

type Props = {
  activity: MysteryBoxActivity;
  catalogBoxes?: MysteryBox[];
  onBack: () => void;
  onOpenBox: (boxId: string) => void;
};

type BoxCard = {
  id: string;
  name: string;
  cover?: string;
  price?: number;
};

function formatCountdown(endTime: string, endedLabel: string, partsLabel: (h: number, m: number, s: number) => string) {
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return endedLabel;
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return partsLabel(hours, minutes, seconds);
}

export function ActivityDetailView({ activity, catalogBoxes = [], onBack, onOpenBox }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildActivityStyles);
  const [detailBoxes, setDetailBoxes] = useState<ActivityBoxSummary[]>([]);
  const [now, setNow] = useState(Date.now());

  const { loadError, loading, runLoad } = useListLoad();

  const reloadDetail = useCallback(async () => {
    await runLoad(async () => {
      const detail = await fetchActivityDetail(activity.id);
      if (detail?.boxes?.length) setDetailBoxes(detail.boxes);
    });
  }, [activity.id, runLoad]);

  useEffect(() => {
    void reloadDetail();
  }, [reloadDetail]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const countdown = useMemo(
    () =>
      formatCountdown(activity.endTime, t("activity.ended"), (hours, minutes, seconds) =>
        t("activity.countdownParts", { hours, minutes, seconds }),
      ),
    [activity.endTime, now, t],
  );

  const boxCards: BoxCard[] = useMemo(() => {
    return activity.boxIds.map((boxId) => {
      const enriched = detailBoxes.find((b) => b.id === boxId);
      if (enriched) {
        return { id: enriched.id, name: enriched.name, cover: enriched.cover ?? undefined, price: enriched.price };
      }
      const box = catalogBoxes.find((b) => b.id === boxId);
      return {
        id: boxId,
        name: box?.name ?? t("activity.boxFallback", { id: boxId.slice(0, 8) }),
        cover: box?.cover,
        price: box?.price,
      };
    });
  }, [activity.boxIds, catalogBoxes, detailBoxes, t]);

  return (
    <View style={styles.page}>
      <SubPageHeader title={activity.title} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        {activity.banner ? (
          <RemoteImage
            uri={resolveBoxImageUrl({ id: activity.id, name: activity.title, cover: activity.banner })}
            style={styles.banner}
          />
        ) : null}
        {activity.subtitle ? <Text style={styles.subtitle}>{activity.subtitle}</Text> : null}
        <Text style={styles.countdown}>{t("activity.countdown", { time: countdown })}</Text>
        <Text style={styles.sectionTitle}>{t("activity.poolTitle")}</Text>
        {loadError ? <ListErrorBanner message={loadError} onRetry={() => void reloadDetail()} /> : null}
        {shouldShowListSkeleton(loading, boxCards.length, loadError) ? (
          <ListSkeleton rows={3} />
        ) : !loadError && boxCards.length ? (
          <OptimizedFlatList
            horizontal
            data={boxCards}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hScroll}
            renderItem={({ item }) => (
              <Pressable
                style={styles.boxCard}
                onPress={() => onOpenBox(item.id)}
                accessibilityRole="button"
                accessibilityLabel={`${item.name}. ${t("activity.openBox")}`}
              >
                <RemoteImage
                  uri={resolveBoxImageUrl({ id: item.id, name: item.name, cover: item.cover })}
                  style={styles.boxCover}
                />
                <Text style={styles.boxName} numberOfLines={2}>
                  {item.name}
                </Text>
                {item.price != null ? <Text style={styles.boxPrice}>{formatCurrency(item.price)}</Text> : null}
                <Text style={styles.link}>{t("activity.openBox")}</Text>
              </Pressable>
            )}
          />
        ) : !loadError ? (
          <Text style={styles.empty}>{t("activity.emptyBoxes")}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const CARD_W = 148;

function buildActivityStyles(colors: ThemeColors) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: colors.bgPage },
    content: { padding: layout.screenPaddingX, paddingBottom: spacing.xxl, gap: spacing.md },
    banner: { width: "100%", height: 160, borderRadius: radius.lg, backgroundColor: colors.bgSoft },
    subtitle: { color: colors.textSecondary, lineHeight: 20 },
    countdown: { fontWeight: "900", color: colors.danger, fontSize: typography.bodyLg },
    sectionTitle: { fontWeight: "800", fontSize: typography.h3, marginTop: spacing.sm, color: colors.textPrimary },
    hScroll: { gap: spacing.sm, paddingRight: spacing.lg },
    boxCard: {
      width: CARD_W,
      backgroundColor: colors.bgCard,
      borderRadius: radius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.xs,
    },
    boxCover: { width: "100%", height: 88, borderRadius: radius.sm },
    boxName: { fontWeight: "700", fontSize: typography.caption, minHeight: 36, color: colors.textPrimary },
    boxPrice: { color: colors.brand, fontWeight: "800" },
    link: { color: colors.brand, fontWeight: "800", fontSize: typography.caption },
    empty: { color: colors.textMuted, textAlign: "center", paddingVertical: spacing.xl },
  });
}

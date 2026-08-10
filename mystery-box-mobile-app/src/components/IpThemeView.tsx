import { useMemo } from "react";
import { RefreshControl, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { OptimizedFlatList } from "./ui/OptimizedFlatList";
import { HomeBoxCard } from "./home/HomeBoxCard";
import { SubPageHeader } from "./ui/SubPageHeader";
import { EmptyState } from "./EmptyState";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { listEmptyWhenOk, shouldShowListSkeleton } from "./ui/listScreenHelpers";
import { ListSkeleton } from "./ListSkeleton";
import { layout, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import type { MysteryBox, MysteryBoxCategory } from "../types";

type Props = {
  boxes: MysteryBox[];
  onBack: () => void;
  onOpenDetails: (id: string) => void;
  catalogLoadError?: string | null;
  onRetryCatalog?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  onGoHome?: () => void;
};

function groupByCategory(boxes: MysteryBox[]) {
  const map = new Map<string, { category: MysteryBoxCategory | null; items: MysteryBox[] }>();
  for (const box of boxes) {
    const key = box.category?.id || "default";
    if (!map.has(key)) {
      map.set(key, { category: box.category ?? null, items: [] });
    }
    map.get(key)!.items.push(box);
  }
  return [...map.values()].sort((a, b) => (a.category?.sortOrder ?? 0) - (b.category?.sortOrder ?? 0));
}

export function IpThemeView({
  boxes,
  onBack,
  onOpenDetails,
  catalogLoadError,
  onRetryCatalog,
  onRefresh,
  refreshing = false,
  onGoHome,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildIpThemeStyles);
  const sections = useMemo(() => groupByCategory(boxes), [boxes]);
  const loadError = catalogLoadError ?? null;

  return (
    <View style={styles.root}>
      <SubPageHeader title={t("ipTheme.title")} onBack={onBack} />
      <Text style={styles.hint}>{t("ipTheme.hint")}</Text>
      {loadError ? <ListErrorBanner message={loadError} onRetry={onRetryCatalog} /> : null}
      {shouldShowListSkeleton(refreshing, boxes.length, loadError) ? (
        <ListSkeleton rows={4} />
      ) : (
        <OptimizedFlatList
          listVariant="row"
          data={sections}
          keyExtractor={(item) => item.category?.id || "default"}
          contentContainerStyle={styles.list}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
            ) : undefined
          }
          ListEmptyComponent={listEmptyWhenOk(
            loadError,
            <EmptyState
              title={t("ipTheme.emptyTitle")}
              description={t("ipTheme.emptyDesc")}
              variant="plain"
              actionLabel={onGoHome ? t("ipTheme.goHome") : undefined}
              onAction={onGoHome}
            />,
          )}
          renderItem={({ item: section }) => (
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>{section.category?.name || t("ipTheme.hotIp")}</Text>
                <Text style={styles.sectionCount}>{t("ipTheme.sectionCount", { count: section.items.length })}</Text>
              </View>
              <View style={styles.grid}>
                {section.items.map((box, index) => (
                  <View key={box.id} style={styles.cell}>
                    <HomeBoxCard item={box} index={index} onPress={onOpenDetails} />
                  </View>
                ))}
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

function buildIpThemeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgPage },
    hint: {
      paddingHorizontal: layout.screenPaddingX,
      paddingBottom: spacing.sm,
      color: colors.textMuted,
      fontSize: typography.caption,
    },
    list: { paddingHorizontal: layout.screenPaddingX, paddingBottom: layout.screenPaddingBottom },
    section: { marginBottom: spacing.lg },
    sectionHead: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    sectionTitle: { fontSize: typography.h3, fontWeight: "900", color: colors.textPrimary },
    sectionCount: { color: colors.textMuted, fontSize: typography.caption, fontWeight: "700" },
    grid: { gap: spacing.sm },
    cell: {},
  });
}

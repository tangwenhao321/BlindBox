import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { parseError } from "../api";
import { getBoxById } from "../services/boxService";
import { toggleFavorite } from "../services/welfareService";
import { useAuthToken } from "../hooks/useAuthToken";
import { useFavoriteIdsQuery } from "../query/hooks/useFavoriteIdsQuery";
import { queueIfOffline } from "../utils/offlineSubmitGuard";
import { invalidateFavoriteQueries } from "../utils/invalidateAppQueries";
import { formatCurrency } from "../utils/formatCurrency";
import { useAppTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { EmptyState } from "./EmptyState";
import { RemoteImage } from "./ui/RemoteImage";
import { SubPageHeader } from "./ui/SubPageHeader";
import { OptimizedFlatList } from "./ui/OptimizedFlatList";
import { ListErrorBanner } from "./ui/ListErrorBanner";
import { listEmptyWhenOk, shouldShowListSkeleton } from "./ui/listScreenHelpers";
import { ListSkeleton } from "./ListSkeleton";
import { InlineSectionError } from "./ui/InlineSectionError";
import { layout, radius, shadows, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import { resolveBoxImageUrl } from "../utils/boxImage";
import type { MysteryBox } from "../types";

type Props = {
  catalogBoxes?: MysteryBox[];
  onBack: () => void;
  onOpenBox: (boxId: string) => void;
  onGoBrowse?: () => void;
};

async function resolveFavoriteBoxes(token: string, ids: string[], catalog: MysteryBox[]) {
  const catalogMap = new Map(catalog.map((box) => [box.id, box]));
  const resolved: MysteryBox[] = [];
  const missing: string[] = [];
  const failedIds: string[] = [];
  for (const id of ids) {
    const cached = catalogMap.get(id);
    if (cached) resolved.push(cached);
    else missing.push(id);
  }
  if (missing.length) {
    const fetched = await Promise.all(
      missing.map(async (id) => {
        try {
          return await getBoxById(token, id);
        } catch {
          failedIds.push(id);
          return null;
        }
      }),
    );
    resolved.push(...fetched.filter((box): box is MysteryBox => !!box));
  }
  return { resolved, failedIds };
}

export function FavoritesView({ catalogBoxes = [], onBack, onOpenBox, onGoBrowse }: Props) {
  const token = useAuthToken();
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildFavoritesStyles);
  const { data: favoriteIds = [], isLoading, isFetching, error, refetch } = useFavoriteIdsQuery(token);
  const [items, setItems] = useState<MysteryBox[]>([]);
  const [failedIds, setFailedIds] = useState<string[]>([]);
  const [resolving, setResolving] = useState(false);
  const loadError = error ? parseError(error) : null;
  const loading = isLoading || resolving;
  const refreshing = isFetching && !isLoading;

  const resolveItems = useCallback(async () => {
    setResolving(true);
    try {
      const { resolved, failedIds: missing } = await resolveFavoriteBoxes(token, favoriteIds, catalogBoxes);
      setItems(resolved);
      setFailedIds(missing);
    } finally {
      setResolving(false);
    }
  }, [token, favoriteIds, catalogBoxes]);

  useEffect(() => {
    if (!favoriteIds.length && !isLoading) {
      setItems([]);
      setFailedIds([]);
      return;
    }
    if (favoriteIds.length) void resolveItems();
  }, [favoriteIds, isLoading, resolveItems]);

  const onPullRefresh = async () => {
    await refetch();
  };

  return (
    <View style={styles.root}>
      <SubPageHeader title={t("favorites.title")} onBack={onBack} />
      {loadError ? <ListErrorBanner message={loadError} onRetry={() => void refetch()} /> : null}
      {shouldShowListSkeleton(loading, items.length + failedIds.length, loadError, refreshing) ? (
        <ListSkeleton variant="row" rows={5} />
      ) : (
        <OptimizedFlatList
          listVariant="card"
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onPullRefresh} tintColor={colors.brand} />}
          ListHeaderComponent={
            failedIds.length ? (
              <View style={styles.failedWrap}>
                {failedIds.map((id) => (
                  <InlineSectionError
                    key={id}
                    message={t("favorites.loadFailed", { id: id.slice(0, 8) })}
                    onRetry={() => void refetch()}
                  />
                ))}
              </View>
            ) : undefined
          }
          ListEmptyComponent={listEmptyWhenOk(
            loadError,
            <EmptyState
              title={t("favorites.emptyTitle")}
              description={t("favorites.emptyDesc")}
              actionLabel={onGoBrowse ? t("favorites.goBrowse") : undefined}
              onAction={onGoBrowse}
            />,
          )}
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => onOpenBox(item.id)}
              accessibilityRole="button"
              accessibilityLabel={item.name}
            >
              <RemoteImage uri={resolveBoxImageUrl(item)} style={styles.thumb} />
              <View style={styles.meta}>
                <Text style={styles.name} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.price}>{formatCurrency(item.price ?? 0)}</Text>
              </View>
              <Pressable
                style={styles.removeBtn}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("favorites.unfavoriteA11y")}
                onPress={async () => {
                  const perform = async () => {
                    await toggleFavorite(token, item.id);
                    invalidateFavoriteQueries(token);
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    await refetch();
                  };
                  if (
                    queueIfOffline(i18n.t("offline.actionUnfavorite"), perform, {
                      kind: "toggleFavorite",
                      token,
                      payload: { boxId: item.id },
                    })
                  )
                    return;
                  await perform();
                }}
              >
                <Text style={styles.remove}>{t("favorites.remove")}</Text>
              </Pressable>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function buildFavoritesStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bgPage },
    failedWrap: { gap: spacing.sm, marginBottom: spacing.sm },
    list: {
      paddingHorizontal: layout.screenPaddingX,
      paddingTop: spacing.sm,
      paddingBottom: layout.screenPaddingBottom,
    },
    hint: { fontSize: typography.body, color: colors.textMuted, textAlign: "center", paddingVertical: spacing.xxl },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      padding: spacing.md,
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing.sm,
      ...shadows.cardSm,
    },
    thumb: { width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.bgSoft },
    meta: { flex: 1, gap: 4 },
    name: { fontSize: typography.body, fontWeight: "800", color: colors.textPrimary },
    price: { fontSize: typography.body, fontWeight: "800", color: colors.brand },
    removeBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
    remove: { fontSize: typography.caption, color: colors.textMuted, fontWeight: "700" },
  });
}

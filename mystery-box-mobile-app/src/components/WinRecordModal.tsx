import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { parseError } from "../api";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { QualityBadge } from "./ui/QualityBadge";
import { QualityFilterChips } from "./ui/QualityFilterChips";
import { ListSkeleton } from "./ListSkeleton";
import { InlineSectionError } from "./ui/InlineSectionError";
import { ListFooterLoading } from "./ui/ListFooterLoading";
import { radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import { fetchDrawFeedPage, type DrawFeedItem } from "../services/drawFeedService";
import { normalizeQualityTier, qualityLabel } from "../utils/quality";
import { filterItemsByQuality, type PrizeQualityFilter } from "../utils/qualityFilters";
import type { Product } from "../types";

type Props = {
  visible: boolean;
  boxId: string | null;
  token?: string;
  products: Product[];
  onClose: () => void;
};

export function WinRecordModal({ visible, boxId, token, products, onClose }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildWinRecordStyles);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [feed, setFeed] = useState<DrawFeedItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [qualityFilter, setQualityFilter] = useState<PrizeQualityFilter>("ALL");

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setLoadMoreError(null);
    setCursor(null);
    try {
      const page = await fetchDrawFeedPage(token, boxId, 20);
      setFeed(page.items);
      setCursor(page.nextCursor);
    } catch (error) {
      setFeed([]);
      setLoadError(parseError(error));
    } finally {
      setLoading(false);
    }
  }, [boxId, token]);

  useEffect(() => {
    if (!visible) return;
    setQualityFilter("ALL");
    void loadInitial();
  }, [visible, loadInitial]);

  const loadMore = () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(null);
    void fetchDrawFeedPage(token, boxId, 20, cursor)
      .then((page) => {
        setFeed((prev) => [...prev, ...page.items]);
        setCursor(page.nextCursor);
      })
      .catch((error) => {
        setLoadMoreError(parseError(error));
      })
      .finally(() => setLoadingMore(false));
  };

  const fallbackLines = useMemo(
    () =>
      products.slice(0, 12).map((p) => ({
        id: p.id,
        displayName: t("winRecord.fallbackName"),
        productName: p.name,
        qualityType: p.qualityType || "GENERAL",
        lastOne: false,
        createdTime: "",
      })),
    [products, t],
  );

  const lines = useMemo(
    () => (feed.length ? feed : loadError ? [] : fallbackLines),
    [feed, loadError, fallbackLines],
  );
  const filteredLines = useMemo(
    () => filterItemsByQuality(lines, qualityFilter),
    [lines, qualityFilter],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.mask}>
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Text style={styles.title}>{t("winRecord.title")}</Text>
            <Pressable
              style={styles.closeBtn}
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t("winRecord.closeA11y")}
            >
              <Text style={styles.close}>×</Text>
            </Pressable>
          </View>
          <Text style={styles.banner}>{t("winRecord.banner")}</Text>
          <View style={styles.filterWrap}>
            <QualityFilterChips value={qualityFilter} onChange={setQualityFilter} />
          </View>
          {loading ? (
            <ListSkeleton variant="row" rows={4} />
          ) : loadError ? (
            <View style={styles.errorWrap}>
              <InlineSectionError message={loadError} onRetry={() => void loadInitial()} />
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.list}
              onScroll={({ nativeEvent }) => {
                const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 80) {
                  loadMore();
                }
              }}
              scrollEventThrottle={200}
            >
              {filteredLines.map((item) => (
                <View key={item.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {t("winRecord.line", {
                        displayName: item.displayName,
                        productName: item.productName,
                        lastOne: item.lastOne ? t("winRecord.lastOne") : "",
                      })}
                    </Text>
                    <Text style={styles.rowMeta}>{qualityLabel(normalizeQualityTier(item.qualityType), t)}</Text>
                  </View>
                  <QualityBadge tier={item.qualityType} compact />
                </View>
              ))}
              {!filteredLines.length ? (
                <Text style={styles.empty}>
                  {lines.length ? t("winRecord.emptyFilter") : t("winRecord.empty")}
                </Text>
              ) : null}
              {loadMoreError ? <InlineSectionError message={loadMoreError} onRetry={loadMore} /> : null}
              {loadingMore ? <ListFooterLoading label={t("winRecord.loadMore")} /> : null}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function buildWinRecordStyles(colors: ThemeColors) {
  return StyleSheet.create({
    mask: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
    sheet: {
      maxHeight: "78%",
      backgroundColor: colors.bgCard,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingBottom: spacing.xl,
    },
    head: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
    },
    title: { fontSize: typography.h3, fontWeight: "900", color: colors.textPrimary },
    closeBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
    close: { fontSize: 24, color: colors.textMuted },
    banner: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xs,
      color: colors.textSecondary,
      fontSize: typography.caption,
    },
    filterWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
    errorWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
    list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.bgSoft,
    },
    rowTitle: { fontWeight: "700", color: colors.textPrimary },
    rowMeta: { marginTop: 2, color: colors.textMuted, fontSize: typography.micro },
    empty: { textAlign: "center", color: colors.textMuted, paddingVertical: spacing.xl },
  });
}

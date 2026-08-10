import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
import type { QueueStatus } from "../../services/drawQueueService";
import { fetchDrawFeedPage, type DrawFeedItem } from "../../services/drawFeedService";
import { resolveQueueProgress } from "../../utils/queueProgress";
import { formatWaitDuration } from "../../utils/formatWaitDuration";
import { QualityBadge } from "../ui/QualityBadge";

type Props = {
  visible: boolean;
  authToken?: string;
  boxId?: string;
  queueStatus: QueueStatus | null;
  onClose: () => void;
};

export function DrawQueueRoomSheet({ visible, authToken, boxId, queueStatus, onClose }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildQueueRoomStyles);
  const [feed, setFeed] = useState<DrawFeedItem[]>([]);

  const refreshFeed = useCallback(() => {
    if (!authToken) {
      setFeed([]);
      return;
    }
    void fetchDrawFeedPage(authToken, boxId ?? null, 12).then((page) => setFeed(page.items));
  }, [authToken, boxId]);

  useEffect(() => {
    if (!visible) return;
    refreshFeed();
    const timer = setInterval(refreshFeed, 20_000);
    return () => clearInterval(timer);
  }, [visible, refreshFeed]);

  const queueProgress = resolveQueueProgress(queueStatus);
  const tickerItems = useMemo(
    () =>
      feed.map((item) => ({
        text: t("drawQueue.feedTicker", {
          name: item.displayName,
          product: item.productName,
          lastOne: item.lastOne ? t("drawQueue.feedLastOne") : "",
        }),
        qualityType: item.qualityType,
      })),
    [feed, t],
  );

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{t("drawQueue.roomTitle")}</Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t("drawQueue.roomCloseA11y")}
              hitSlop={12}
            >
              <Text style={styles.close}>×</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {queueStatus?.canDraw ? (
              <Text style={styles.readyText}>{t("drawQueue.yourTurn")}</Text>
            ) : queueStatus && queueStatus.position > 0 ? (
              <Text style={styles.positionText}>
                {t("drawQueue.waiting", { position: queueStatus.position, total: queueStatus.total })}
              </Text>
            ) : (
              <Text style={styles.positionText}>{t("drawQueue.joining")}</Text>
            )}

            {queueStatus && !queueStatus.canDraw && (queueStatus.queueSize ?? queueStatus.total) > 0 ? (
              <Text style={styles.meta}>
                {t("drawQueue.queueMeta", {
                  size: queueStatus.queueSize ?? queueStatus.total,
                  wait:
                    queueStatus.estimatedWaitSec != null && queueStatus.estimatedWaitSec > 0
                      ? formatWaitDuration(queueStatus.estimatedWaitSec)
                      : t("drawQueue.waitUnknown"),
                })}
              </Text>
            ) : null}

            {queueStatus && queueStatus.total > 0 ? (
              <View
                style={styles.progressTrack}
                accessibilityRole="progressbar"
                accessibilityValue={{ min: 0, max: 100, now: Math.round(queueProgress * 100) }}
              >
                <View style={[styles.progressFill, { width: `${Math.round(queueProgress * 100)}%` }]} />
              </View>
            ) : null}

            {queueStatus?.queueExpiresInSeconds ? (
              <Text
                style={[
                  styles.meta,
                  queueStatus.queueExpiresInSeconds <= 60 ? styles.metaWarn : null,
                ]}
              >
                {queueStatus.queueExpiresInSeconds <= 60
                  ? t("drawQueue.expiringSoon", { seconds: queueStatus.queueExpiresInSeconds })
                  : t("drawQueue.validMinutes", { minutes: Math.floor(queueStatus.queueExpiresInSeconds / 60) })}
              </Text>
            ) : null}

            <Text style={styles.feedTitle}>{t("drawQueue.feedTitle")}</Text>
            {tickerItems.length === 0 ? (
              <Text style={styles.feedEmpty}>{t("drawQueue.feedEmpty")}</Text>
            ) : (
              tickerItems.map((item, index) => (
                <View key={`${item.text}-${index}`} style={styles.feedRow}>
                  {item.qualityType ? <QualityBadge tier={item.qualityType} compact /> : null}
                  <Text style={styles.feedText} numberOfLines={2}>
                    {item.text}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function buildQueueRoomStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
    sheet: {
      maxHeight: "88%",
      minHeight: "52%",
      backgroundColor: colors.bgPage,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      overflow: "hidden",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    title: { fontSize: typography.h4, fontWeight: "900", color: colors.textPrimary },
    close: { fontSize: 28, color: colors.textMuted, lineHeight: 28 },
    body: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
    readyText: { fontSize: typography.bodyLg, fontWeight: "800", color: colors.queueReadyText },
    positionText: { fontSize: typography.body, fontWeight: "700", color: colors.textPrimary },
    meta: { fontSize: typography.caption, color: colors.textSecondary },
    metaWarn: { color: colors.warning, fontWeight: "700" },
    progressTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
      overflow: "hidden",
      marginVertical: spacing.xs,
    },
    progressFill: {
      height: "100%",
      borderRadius: 4,
      backgroundColor: colors.brand,
    },
    feedTitle: {
      marginTop: spacing.md,
      fontSize: typography.body,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    feedEmpty: { fontSize: typography.caption, color: colors.textMuted },
    feedRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: spacing.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    feedText: { flex: 1, fontSize: typography.caption, color: colors.textSecondary },
  });
}

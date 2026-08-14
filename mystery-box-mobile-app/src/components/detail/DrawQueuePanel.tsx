import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BuyoutLockBar } from "./BuyoutLockBar";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
import type { QueueStatus } from "../../services/drawQueueService";
import { resolveQueueProgress } from "../../utils/queueProgress";
import { notifyQueueYourTurn } from "../../utils/queueTurnNotification";
import { formatWaitDuration } from "../../utils/formatWaitDuration";
import { toast } from "../../utils/toast";
import type { DrawMode } from "../../services/orderService";

type Props = {
  mode: DrawMode;
  authToken?: string;
  queueStatus: QueueStatus | null;
  buyoutLockTtl: number;
  buyoutLockHeld: boolean;
  poolRemaining: number;
  onOpenQueueRoom?: () => void;
};

export function DrawQueuePanel({
  mode,
  authToken,
  queueStatus,
  buyoutLockTtl,
  buyoutLockHeld,
  poolRemaining,
  onOpenQueueRoom,
}: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildDrawQueuePanelStyles);
  const prevCanDraw = useRef(false);
  const warnedExpiry = useRef(false);

  useEffect(() => {
    if (mode !== "queue" || !queueStatus?.canDraw) {
      prevCanDraw.current = queueStatus?.canDraw ?? false;
      return;
    }
    if (!prevCanDraw.current && queueStatus.canDraw) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(t("drawQueue.yourTurnToast"));
      void notifyQueueYourTurn({ authToken });
    }
    prevCanDraw.current = queueStatus.canDraw;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional deps
  }, [mode, queueStatus?.canDraw, t]);

  useEffect(() => {
    if (mode !== "queue" || !queueStatus?.queueExpiresInSeconds) {
      warnedExpiry.current = false;
      return;
    }
    if (queueStatus.queueExpiresInSeconds <= 60 && !warnedExpiry.current) {
      warnedExpiry.current = true;
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [mode, queueStatus?.queueExpiresInSeconds]);

  if (mode === "instant" || mode === "cabinet") return null;

  if (mode === "buyout") {
    return (
      <BuyoutLockBar ttlSeconds={buyoutLockTtl} poolRemaining={poolRemaining} held={buyoutLockHeld} />
    );
  }

  const queueProgress = resolveQueueProgress(queueStatus);

  return (
    <View
      style={[styles.wrap, queueStatus?.canDraw ? styles.ready : null]}
      testID="drawQueuePanel"
      accessibilityRole="summary"
      accessibilityLabel={t("drawQueue.panelA11y")}
    >
      {queueStatus?.canDraw ? (
        <Text style={styles.readyText} accessibilityLiveRegion="polite">
          {t("drawQueue.yourTurn")}
        </Text>
      ) : queueStatus && queueStatus.position > 0 ? (
        <Text style={styles.text} accessibilityLiveRegion="polite">
          {t("drawQueue.waiting", { position: queueStatus.position, total: queueStatus.total })}
        </Text>
      ) : (
        <Text style={styles.text} accessibilityLiveRegion="polite">
          {t("drawQueue.joining")}
        </Text>
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
        <Text style={[styles.meta, queueStatus.queueExpiresInSeconds <= 60 ? styles.metaWarn : null]}>
          {queueStatus.queueExpiresInSeconds <= 60
            ? t("drawQueue.expiringSoon", { seconds: queueStatus.queueExpiresInSeconds })
            : t("drawQueue.validMinutes", { minutes: Math.floor(queueStatus.queueExpiresInSeconds / 60) })}
        </Text>
      ) : null}
      {onOpenQueueRoom ? (
        <Pressable
          style={styles.roomBtn}
          onPress={onOpenQueueRoom}
          accessibilityRole="button"
          accessibilityLabel={t("drawQueue.viewRoomA11y")}
        >
          <Text style={styles.roomBtnText}>{t("drawQueue.viewRoom")}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function buildDrawQueuePanelStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      padding: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: colors.bgSoft,
      gap: spacing.xs,
    },
    ready: { backgroundColor: colors.queueReadyBg },
    readyText: { fontSize: typography.body, fontWeight: "700", color: colors.queueReadyText },
    text: { fontSize: typography.body, color: colors.textPrimary },
    meta: { fontSize: typography.caption, color: colors.textSecondary },
    metaWarn: { color: colors.warning, fontWeight: "700" },
    progressTrack: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.border,
      overflow: "hidden",
      marginTop: spacing.xs,
    },
    progressFill: {
      height: "100%",
      borderRadius: 3,
      backgroundColor: colors.brand,
    },
    roomBtn: {
      marginTop: spacing.xs,
      alignSelf: "flex-start",
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.pill,
      backgroundColor: colors.bgCard,
      borderWidth: 1,
      borderColor: colors.border,
    },
    roomBtnText: { fontSize: typography.micro, fontWeight: "800", color: colors.brand },
  });
}

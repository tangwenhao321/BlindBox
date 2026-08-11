import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  getRevealRoomProgress,
  getRevealSocialRoomState,
  joinRevealSpectatorRoom,
  leaveRevealSpectatorRoom,
  subscribeRevealRoomProgress,
  subscribeRevealSocialRoom,
} from "../effects/revealSocialRoom";
import { useSpectatorSnapshotRefresh } from "../hooks/useSpectatorSnapshotRefresh";
import { nightColors, radius, spacing } from "../styles/tokens";
import { RevealSpectatorPlayer } from "./ui/RevealSpectatorPlayer";
import { RevealReactionTicker } from "./ui/RevealReactionTicker";

type Props = {
  token: string;
  orderId?: string;
  authToken?: string | null;
};

export function RevealSpectatorScreen({ token, orderId, authToken }: Props) {
  const { t } = useTranslation();
  const [roomState, setRoomState] = useState(getRevealSocialRoomState());
  const [progress, setProgress] = useState(getRevealRoomProgress());
  const { snapshot, resolvedPhase, resolvedOrderId: resolvedOrderIdFromSession, status, retry } =
    useSpectatorSnapshotRefresh(token, progress);
  const joinedOrderRef = useRef<string | null>(null);

  useEffect(() => {
    return subscribeRevealSocialRoom(setRoomState);
  }, []);

  useEffect(() => {
    return subscribeRevealRoomProgress(setProgress);
  }, []);

  useEffect(() => {
    if (status !== "ready" || !snapshot) return;
    const resolvedOrderId = orderId ?? resolvedOrderIdFromSession;
    if (!resolvedOrderId || joinedOrderRef.current === resolvedOrderId) return;
    joinedOrderRef.current = resolvedOrderId;
    void joinRevealSpectatorRoom(resolvedOrderId, authToken ?? token).then(() => {
      setRoomState(getRevealSocialRoomState());
    });
    return () => {
      joinedOrderRef.current = null;
      leaveRevealSpectatorRoom();
    };
  }, [status, snapshot, orderId, resolvedOrderIdFromSession, authToken, token]);

  if (status === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={nightColors.brand} />
      </View>
    );
  }

  if (status === "expired") {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>{t("spectator.expired")}</Text>
      </View>
    );
  }

  if (status === "error") {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>{t("spectator.loadError")}</Text>
        <Pressable style={styles.retryButton} onPress={retry} accessibilityRole="button">
          <Text style={styles.retryText}>{t("spectator.retry")}</Text>
        </Pressable>
      </View>
    );
  }

  if (!snapshot) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>{t("spectator.expired")}</Text>
      </View>
    );
  }

  const livePhase = progress?.phase ?? resolvedPhase;

  return (
    <View style={styles.host} testID="spectatorScreen">
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t("spectator.title")}</Text>
        <View style={styles.liteBadge} accessibilityRole="text" testID="spectatorLiteBadge">
          <Text style={styles.liteBadgeText}>{t("spectator.liteBadge")}</Text>
        </View>
      </View>
      <Text style={styles.liteHint}>{t("spectator.liteHint")}</Text>
      {roomState === "synced" ? (
        <Text style={styles.sync} testID="spectatorRoomSync">
          {t("spectator.roomSynced")}
        </Text>
      ) : roomState === "polling" ? (
        <Text style={styles.sync} testID="spectatorRoomPolling">
          {t("spectator.roomPolling")}
        </Text>
      ) : null}
      <RevealSpectatorPlayer snapshot={snapshot} phase={livePhase} progress={progress} />
      <RevealReactionTicker testID="spectatorReactionTicker" />
    </View>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1, padding: spacing.lg, backgroundColor: nightColors.bgPage },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: nightColors.bgPage,
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  title: { color: nightColors.textPrimary, fontSize: 22, fontWeight: "700" },
  liteBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: nightColors.brassPanelBorder,
    backgroundColor: nightColors.bgBrandSoft,
  },
  liteBadgeText: {
    color: nightColors.brandText,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  liteHint: {
    color: nightColors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  sync: { color: nightColors.successText, fontSize: 13, marginBottom: spacing.sm },
  text: { color: nightColors.textPrimary, textAlign: "center" },
  retryButton: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: nightColors.bgBrandSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: nightColors.brassPanelBorder,
  },
  retryText: { color: nightColors.brandText, fontWeight: "700" },
});

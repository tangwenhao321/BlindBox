import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import type { RoomProgress } from "../../effects/revealSocialRoom";
import { parseSpectatorSnapshot } from "../../effects/revealSpectatorSnapshot";
import { playChargeSound } from "../../effects/sound";
import { resolveProductImageUrl } from "../../utils/boxImage";
import { normalizeQualityTier } from "../../utils/quality";
import { getRuntimeRevealSoundEnabled } from "../../utils/revealSettings";
import { nightColors, radius } from "../../styles/tokens";
import { QualityBadge } from "./QualityBadge";
import { RemoteImage } from "./RemoteImage";
import { RevealStaticFallback } from "./RevealStaticFallback";

type Props = {
  snapshot: Record<string, unknown>;
  phase?: string;
  progress: RoomProgress | null;
  testID?: string;
};

export function RevealSpectatorPlayer({ snapshot, phase, progress, testID = "spectatorPlayer" }: Props) {
  const { t } = useTranslation();
  const parsed = useMemo(() => parseSpectatorSnapshot(snapshot), [snapshot]);
  const liveIndex = progress?.revealIndex ?? parsed.revealIndex;
  const liveTotal =
    progress?.total && progress.total > 0 ? progress.total : parsed.total || parsed.products.length || 1;
  const livePhase = phase ?? progress?.phase ?? "playing";
  const clampedIndex = Math.max(0, Math.min(liveIndex, Math.max(liveTotal - 1, 0)));
  const currentProduct = parsed.products[clampedIndex] ?? parsed.products[parsed.products.length - 1] ?? null;
  const revealedProducts = parsed.products.length
    ? parsed.products.slice(0, clampedIndex + 1)
    : currentProduct
      ? [currentProduct]
      : [];

  const pulse = useSharedValue(1);
  const chargePlayedRef = useRef(false);

  useEffect(() => {
    if (livePhase !== "playing" && livePhase !== "gap") {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withSequence(withTiming(1.04, { duration: 520, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: 520 })),
      -1,
      true,
    );
  }, [livePhase, pulse]);

  useEffect(() => {
    if (livePhase !== "playing" || chargePlayedRef.current) return;
    chargePlayedRef.current = true;
    void playChargeSound("GENERAL", getRuntimeRevealSoundEnabled());
  }, [livePhase]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  if (livePhase === "summary" || livePhase === "idle") {
    return (
      <View style={styles.host} testID={testID}>
        <View style={styles.liteCaptionRow}>
          <Text style={styles.liteCaption}>{t("spectator.liteBadge")}</Text>
        </View>
        <RevealStaticFallback products={revealedProducts.length ? revealedProducts : parsed.products} />
        <Text style={styles.liteHint}>{t("spectator.liteHint")}</Text>
      </View>
    );
  }

  const tier = currentProduct ? normalizeQualityTier(currentProduct.qualityType) : "GENERAL";
  const isRare = tier === "LEGENDARY" || tier === "LEGEND" || tier === "HIDDEN" || tier === "EPIC";

  return (
    <View style={styles.host} testID={testID}>
      <LinearGradient colors={[nightColors.bgCard, nightColors.bgPage]} style={styles.backdrop}>
        <View style={styles.lustreRim} pointerEvents="none" />
        <View style={styles.liteCaptionRow}>
          <Text style={styles.liteCaption} testID="spectatorLiteCaption">
            {t("spectator.liteBadge")}
          </Text>
        </View>
        <Text style={styles.phaseLabel}>
          {livePhase === "gap"
            ? t("spectator.phaseGap")
            : livePhase === "playing"
              ? t("spectator.phasePlaying")
              : t("spectator.phaseUnknown")}
        </Text>
        {currentProduct ? (
          <Animated.View style={[styles.card, isRare ? styles.cardRare : null, cardStyle]}>
            <RemoteImage
              uri={resolveProductImageUrl(currentProduct.id, currentProduct.name)}
              style={styles.image}
            />
            <Text style={styles.name} numberOfLines={2}>
              {currentProduct.name}
            </Text>
            {currentProduct.qualityType ? <QualityBadge tier={currentProduct.qualityType} /> : null}
          </Animated.View>
        ) : (
          <Text style={styles.waiting}>{t("spectator.waitingHost")}</Text>
        )}
        <Text style={styles.progressHint} testID="spectatorProgress">
          {t("spectator.progress", {
            current: clampedIndex + 1,
            total: liveTotal,
          })}
        </Text>
        <Text style={styles.liteHint}>{t("spectator.liteHint")}</Text>
        <Text style={styles.readOnly}>{t("spectator.readOnlyHint")}</Text>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1, minHeight: 280 },
  backdrop: {
    flex: 1,
    borderRadius: radius.lg,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: nightColors.brassPanelBorder,
  },
  lustreRim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: "rgba(196, 165, 116, 0.28)",
  },
  liteCaptionRow: {
    alignSelf: "stretch",
    alignItems: "flex-start",
  },
  liteCaption: {
    color: nightColors.brandText,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: nightColors.brassPanelBorder,
    backgroundColor: "rgba(196, 165, 116, 0.12)",
    overflow: "hidden",
  },
  liteHint: {
    color: nightColors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  phaseLabel: {
    color: nightColors.brandText,
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  card: { alignItems: "center", gap: 10, maxWidth: 280 },
  cardRare: {
    borderWidth: 1,
    borderColor: "rgba(196, 165, 116, 0.5)",
    borderRadius: radius.lg,
    padding: 12,
  },
  image: { width: 140, height: 140, borderRadius: 12 },
  name: { color: nightColors.textPrimary, fontSize: 18, fontWeight: "800", textAlign: "center" },
  waiting: { color: nightColors.textSecondary, fontSize: 16 },
  progressHint: { color: nightColors.textPrimary, fontSize: 15, fontWeight: "600" },
  readOnly: { color: nightColors.textMuted, fontSize: 12, textAlign: "center" },
});

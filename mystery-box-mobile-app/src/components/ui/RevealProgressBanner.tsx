import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import type { Product } from "../../types";
import { buildRevealProgressModel, resolveRevealPacing } from "../../effects/revealSequenceEngine";
import { resolveCeremonyTier } from "../../effects/ceremonyTier";
import { pickCopyPoolKey, resolveCopyLengthBucket, resolveCopyPoolPrefix, resolveCopyPoolTier, countDryStreakReveals, resolveDryStreakCopyPoolPrefix } from "../../effects/revealCopyPool";
import { resolveProgressTextStyle } from "../../effects/revealVisualTokens";
import { revealLayerZIndex } from "../../effects/revealLayerZIndex";
import { getRevealRemoteConfig } from "../../effects/revealRemote";
import { rnSpring } from "../../effects/reanimated/springConfig";

type Props = {
  visible: boolean;
  revealedProducts: Product[];
  allProducts: Product[];
  revealIndex: number;
  total: number;
  orderId?: string;
  chromeSafeTop?: number;
  splitScale?: number;
  flashPeak?: boolean;
};

export function RevealProgressBanner({
  visible,
  revealedProducts,
  allProducts,
  revealIndex,
  total,
  orderId,
  chromeSafeTop = 96,
  splitScale = 1,
  flashPeak = false,
}: Props) {
  const { t } = useTranslation();
  const chipScale = useSharedValue(1);
  const fillScale = useSharedValue(1);

  const model = buildRevealProgressModel(revealedProducts, allProducts, revealIndex, total);
  const currentProduct = allProducts[revealIndex];
  const ceremony = currentProduct ? resolveCeremonyTier(currentProduct, allProducts) : undefined;
  const pacing = resolveRevealPacing(revealIndex, total, ceremony);
  const poolTier = resolveCopyPoolTier(ceremony, pacing, countDryStreakReveals(revealedProducts, allProducts));
  const remote = getRevealRemoteConfig();
  const poolSize = remote.copyPoolSizes[poolTier as keyof typeof remote.copyPoolSizes] ?? 4;
  const holdMs = pacing === "fast" ? 720 : pacing === "ceremony" || pacing === "finale" ? 2600 : 1400;
  const lengthBucket = resolveCopyLengthBucket(holdMs);
  const basePrefix =
    poolTier === "dryStreak"
      ? resolveDryStreakCopyPoolPrefix(lengthBucket)
      : poolTier === "ultimate"
        ? "progressUltimate"
        : poolTier === "finale"
          ? "progressFinalePool"
          : poolTier === "rare"
            ? "progressRare"
            : "progressGeneral";
  const poolPrefix = resolveCopyPoolPrefix(lengthBucket, basePrefix);
  const poolKey = pickCopyPoolKey(poolPrefix, poolSize, `${orderId ?? "x"}:${revealIndex}`);
  const pooled = t(`revealOverlay.${poolKey}`, { defaultValue: "" });
  const subtitle =
    pooled ||
    (model.subtitleKey === "progressFinaleSoon"
      ? t("revealOverlay.progressFinaleSoon")
      : model.subtitleKey === "progressComfort"
        ? t("revealOverlay.progressComfort")
        : t("revealOverlay.progressDefault"));

  useEffect(() => {
    if (!visible) return;
    const isNewRare = ceremony != null && ceremony !== "GENERAL";
    if (isNewRare) {
      chipScale.value = withSequence(withSpring(1.12, rnSpring(8, 160)), withSpring(1, rnSpring(6, 120)));
    }
    fillScale.value = withSequence(withSpring(1.04, rnSpring(7, 140)), withSpring(1, rnSpring(6, 110)));
  }, [visible, revealIndex, ceremony, chipScale, fillScale]);

  const chipStyle = useAnimatedStyle(() => ({
    transform: [{ scale: chipScale.value }],
  }));

  if (!visible || total <= 1) return null;

  return (
    <Animated.View
      style={[
        styles.host,
        chipStyle,
        { top: chromeSafeTop + (flashPeak ? -12 : 0) },
      ]}
      pointerEvents="none"
    >
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(model.progress * 100)}%` }]} />
      </View>
      <Text
        style={[styles.title, resolveProgressTextStyle(), { fontSize: Math.round(13 * splitScale) }]}
        numberOfLines={1}
      >
        {t("revealOverlay.progressTitle", { current: model.current, total: model.total })}
      </Text>
      <Text style={[styles.subtitle, { fontSize: Math.round(11 * splitScale) }]} numberOfLines={1}>
        {subtitle}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    top: 96,
    left: 20,
    right: 20,
    zIndex: revealLayerZIndex.banner,
    alignItems: "center",
    gap: 6,
  },
  track: {
    width: "100%",
    maxWidth: 320,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: "rgba(255, 214, 120, 0.92)",
  },
  title: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  subtitle: {
    color: "rgba(255,255,255,0.62)",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    maxWidth: 320,
  },
});

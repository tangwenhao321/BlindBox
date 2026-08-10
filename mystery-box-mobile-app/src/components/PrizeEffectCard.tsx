import { useEffect, useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { getEffectProfile, resolvePrizeTier } from "../effects/config";
import { effectProfileTitle } from "../utils/effectProfileI18n";
import { QualityBadge } from "./ui/QualityBadge";
import type { Product } from "../types";

type Props = {
  product: Product;
};

export function PrizeEffectCard({ product }: Props) {
  const { t } = useTranslation();
  const tier = useMemo(() => resolvePrizeTier(product.qualityType), [product.qualityType]);
  const profile = useMemo(() => getEffectProfile(tier), [tier]);
  const pulse = useSharedValue(0);
  const shimmer = useSharedValue(0);
  const sparkle = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 520 }),
        withTiming(0, { duration: 520 }),
      ),
      -1,
      false,
    );
    shimmer.value = withRepeat(withTiming(1, { duration: 1150, easing: Easing.linear }), -1, false);
    sparkle.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 420 }),
        withTiming(0.15, { duration: 420 }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(pulse);
      cancelAnimation(shimmer);
      cancelAnimation(sparkle);
    };
  }, [pulse, shimmer, sparkle]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, profile.pulseScale]) }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(shimmer.value, [0, 1], [-120, 220]) },
      { rotate: "24deg" },
    ],
  }));

  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: sparkle.value,
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, profile.pulseScale]) }],
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.glow, { backgroundColor: profile.glowColor }, glowStyle]} />
      <View style={styles.card}>
        <View style={styles.badgeRow}>
          <Text style={styles.title}>{effectProfileTitle(t, tier)}</Text>
          <QualityBadge tier={product.qualityType} compact />
        </View>
        <Text style={styles.name}>{product.name}</Text>
        <Text style={styles.meta}>{t("prizeEffect.meta")}</Text>
      </View>
      <Animated.View
        style={[styles.shimmer, { backgroundColor: profile.sparkleColor }, shimmerStyle]}
      />
      <Animated.View style={[styles.sparkDot, { backgroundColor: profile.sparkleColor }, sparkleStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 10,
    borderRadius: 14,
    overflow: "hidden",
    minHeight: 86,
    justifyContent: "center",
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 14,
  },
  card: {
    backgroundColor: "rgba(9, 11, 24, 0.84)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  badgeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: {
    color: "#ffd166",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  name: {
    marginTop: 4,
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },
  meta: {
    marginTop: 4,
    color: "#d9dff7",
    fontSize: 12,
  },
  shimmer: {
    position: "absolute",
    top: -40,
    left: -80,
    width: 38,
    height: 190,
    opacity: 0.26,
  },
  sparkDot: {
    position: "absolute",
    right: 14,
    top: 10,
    width: 10,
    height: 10,
    borderRadius: 999,
  },
});

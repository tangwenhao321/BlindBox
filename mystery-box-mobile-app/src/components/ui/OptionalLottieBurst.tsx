import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, StyleSheet, useWindowDimensions, View } from "react-native";
import LottieView from "lottie-react-native";
import type { PrizeTier } from "../../effects/config";
import { normalizeCeremonyTier, type CeremonyTier } from "../../effects/ceremonyTier";
import { LustreBurstAura } from "./LustreBurstAura";

type Props = {
  tier: PrizeTier;
  visible: boolean;
  reduceMotion?: boolean;
  lustreRim?: readonly string[];
  loop?: boolean;
  fullscreen?: boolean;
};

/**
 * Per-tier Lottie: ribbon burst / success check / confetti cannons / dense confetti.
 * See src/assets/effects/README.md and src/assets/ATTRIBUTION.md.
 */
const SOURCES = {
  GENERAL: require("../../assets/effects/box-open.json"),
  HIDDEN: require("../../assets/effects/hidden-burst.json"),
  TREASURE_LEGEND: require("../../assets/effects/legendary-burst.json"),
  PEERLESS: require("../../assets/effects/peerless-burst.json"),
  TREASURE_PEERLESS: require("../../assets/effects/peerless-burst.json"),
  LEGENDARY: require("../../assets/effects/legendary-burst.json"),
} as const satisfies Record<PrizeTier, object>;

function lottiePreset(tier: CeremonyTier) {
  if (tier === "GENERAL") return { source: SOURCES.GENERAL, scale: 1, speed: 1 };
  if (tier === "HIDDEN") return { source: SOURCES.HIDDEN, scale: 1.12, speed: 0.92 };
  if (tier === "PEERLESS") return { source: SOURCES.PEERLESS, scale: 1.22, speed: 1.12 };
  if (tier === "TREASURE_PEERLESS") return { source: SOURCES.TREASURE_PEERLESS, scale: 1.38, speed: 1.22 };
  return { source: SOURCES.TREASURE_LEGEND, scale: 1.08, speed: 1.04 };
}

export function OptionalLottieBurst({
  tier,
  visible,
  reduceMotion = false,
  lustreRim,
  loop = false,
  fullscreen = false,
}: Props) {
  const { width, height } = useWindowDimensions();
  const ref = useRef<LottieView>(null);
  const [systemReduceMotion, setSystemReduceMotion] = useState(false);
  const skip = reduceMotion || systemReduceMotion;
  const preset = lottiePreset(normalizeCeremonyTier(tier));

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setSystemReduceMotion)
      .catch(() => setSystemReduceMotion(false));
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", setSystemReduceMotion);
    return () => sub?.remove?.();
  }, []);

  useEffect(() => {
    if (!visible || skip) return;
    ref.current?.reset();
    ref.current?.play();
  }, [visible, tier, skip]);

  if (!visible || skip) return null;

  const size = fullscreen
    ? Math.min(width, height) * (loop ? 1.42 : 1.22)
    : (loop ? 340 : 280) * preset.scale;

  return (
    <View style={styles.host} pointerEvents="none">
      <LustreBurstAura tier={tier} visible={visible} reduceMotion={skip} colors={lustreRim} size={size * 1.08} />
      <LottieView
        ref={ref}
        source={preset.source}
        autoPlay
        loop={loop}
        speed={preset.speed}
        style={{ width: size, height: size, zIndex: 7 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 6,
  },
});

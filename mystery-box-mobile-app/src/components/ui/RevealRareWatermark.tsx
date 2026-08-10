import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { getRevealRemoteConfig } from "../../effects/revealRemote";
import { resolveRecordingSafeRevealFlags } from "../../effects/revealRecordingMode";

type Props = {
  visible: boolean;
  opacityScale?: number;
};

/** Lightweight drifting watermark for high-tier reveals (remote toggle). */
export function RevealRareWatermark({ visible, opacityScale = 1 }: Props) {
  const { t } = useTranslation();
  const remote = getRevealRemoteConfig();
  const recordingFlags = resolveRecordingSafeRevealFlags();
  const driftX = useSharedValue(0);
  const driftY = useSharedValue(0);
  const alpha = Math.min(0.35, Math.max(0.06, (remote.rareWatermarkOpacity ?? 0.14) * opacityScale));
  const enabled = visible && remote.rareWatermarkEnabled && !recordingFlags.hideWatermark;

  useEffect(() => {
    if (!enabled) {
      cancelAnimation(driftX);
      cancelAnimation(driftY);
      return;
    }
    driftX.value = withRepeat(
      withSequence(
        withTiming(18, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
        withTiming(-14, { duration: 4200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
    driftY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 3600, easing: Easing.inOut(Easing.sin) }),
        withTiming(12, { duration: 3600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      true,
    );
    return () => {
      cancelAnimation(driftX);
      cancelAnimation(driftY);
    };
  }, [enabled, driftX, driftY]);

  const style = useAnimatedStyle(() => ({
    opacity: alpha,
    transform: [{ translateX: driftX.value }, { translateY: driftY.value }, { rotate: "-18deg" }],
  }));

  if (!enabled) return null;

  return (
    <Animated.View style={[styles.host, style]} pointerEvents="none">
      <Text style={styles.text}>{t("revealOverlay.rareWatermark")}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    alignSelf: "center",
    top: "46%",
    zIndex: 11,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 3,
  },
});

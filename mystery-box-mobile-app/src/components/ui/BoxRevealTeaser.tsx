import { useEffect, useRef } from "react";
import { PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { getRevealRemoteConfig } from "../../effects/revealRemote";
import { playTierSoundSynced } from "../../effects/sound";
import { RemoteImage } from "./RemoteImage";
import { rnSpring } from "../../effects/reanimated/springConfig";

type Props = {
  visible: boolean;
  boxCoverUri?: string;
  teaserOpacity: SharedValue<number>;
  accentColor: string;
  variant?: "full" | "mini";
  boxTapEnabled?: boolean;
};

/** 开箱前摇：盲盒抖动 + 盒盖弹开 */
export function BoxRevealTeaser({
  visible,
  boxCoverUri,
  teaserOpacity,
  accentColor,
  variant = "full",
  boxTapEnabled = false,
}: Props) {
  const { t } = useTranslation();
  const isMini = variant === "mini";
  const remote = getRevealRemoteConfig();
  const wobbleRepeats = isMini ? (remote.achievementHintsEnabled ? 3 : 2) : 4;
  const wobbleDuration = isMini ? 70 : 90;
  const wobble = useSharedValue(0);
  const lidLift = useSharedValue(0);
  const tapWobble = useSharedValue(0);
  const tapBubble = useSharedValue(0);
  const tapSeedRef = useRef(0);
  const poseSeedRef = useRef(Math.random() * 2 - 1);
  const triggerRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (!visible) {
      cancelAnimation(wobble);
      cancelAnimation(lidLift);
      return;
    }
    wobble.value = 0;
    lidLift.value = 0;
    poseSeedRef.current = Math.random() * 2 - 1;
    wobble.value = withRepeat(
      withSequence(
        withTiming(1, { duration: wobbleDuration, easing: Easing.linear }),
        withTiming(-1, { duration: wobbleDuration, easing: Easing.linear }),
        withTiming(0, { duration: Math.max(50, wobbleDuration - 20), easing: Easing.linear }),
      ),
      wobbleRepeats,
      false,
    );
    lidLift.value = withDelay(isMini ? 120 : 180, withSpring(1, rnSpring(5, 160)));
    if (isMini) {
      if (remote.finaleTeaserHapticEnabled) {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      if (remote.finaleTeaserSoundEnabled) {
        void playTierSoundSynced("HIDDEN", true);
      }
    }
    return () => {
      cancelAnimation(wobble);
      cancelAnimation(lidLift);
    };
  }, [visible, wobble, lidLift, isMini, wobbleRepeats, wobbleDuration, remote.finaleTeaserHapticEnabled, remote.finaleTeaserSoundEnabled]);

  const hostStyle = useAnimatedStyle(() => ({ opacity: teaserOpacity.value }));

  const boxStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { rotateX: `${interpolate(lidLift.value, [0, 1], [14, 6])}deg` },
      {
        rotate:
          (interpolate(wobble.value, [-1, 1], [-4, 4]) +
            interpolate(tapWobble.value, [-1, 1], [-6, 6]) +
            poseSeedRef.current * 3) +
          "deg",
      },
      { translateX: poseSeedRef.current * 6 },
      { scale: interpolate(teaserOpacity.value, [0, 0.4, 1], [0.55, 1.05, 1]) * (1 + tapBubble.value * 0.06) },
    ],
  }));

  const triggerBoxTapFx = () => {
    if (!boxTapEnabled && !getRevealRemoteConfig().boxDragInteractionEnabled) return;
    tapSeedRef.current += 1;
    tapWobble.value = 0;
    tapBubble.value = 0;
    tapWobble.value = withSequence(
      withTiming(tapSeedRef.current % 2 === 0 ? 1 : -1, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 120, easing: Easing.inOut(Easing.quad) }),
    );
    tapBubble.value = withSequence(
      withTiming(1, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 160, easing: Easing.in(Easing.quad) }),
    );
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  triggerRef.current = triggerBoxTapFx;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        getRevealRemoteConfig().boxDragInteractionEnabled &&
        (Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6),
      onPanResponderRelease: () => triggerRef.current(),
    }),
  ).current;

  const lidStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(lidLift.value, [0, 1], [0, -36]) },
      { rotate: interpolate(lidLift.value, [0, 1], [0, -18]) + "deg" },
    ],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.host, hostStyle]} pointerEvents="box-none">
      <Pressable onPress={triggerBoxTapFx} disabled={!boxTapEnabled} accessibilityRole="button">
        <Animated.View style={[styles.boxWrap, boxStyle]} {...panResponder.panHandlers}>
          <LinearGradient colors={["#2a2a35", "#12121a", "#0a0a10"]} style={styles.boxBody}>
            {boxCoverUri ? (
              <RemoteImage uri={boxCoverUri} style={styles.cover} contentFit="cover" />
            ) : (
              <View style={[styles.coverPlaceholder, { borderColor: accentColor }]} />
            )}
          </LinearGradient>
          <Animated.View style={[styles.lid, { borderColor: accentColor }, lidStyle]}>
            <LinearGradient colors={[accentColor, "#ffffff55"]} style={styles.lidShine} />
          </Animated.View>
          <View style={[styles.seam, { backgroundColor: accentColor }]} />
        </Animated.View>
      </Pressable>
      <Text style={styles.hint}>{isMini ? t("revealOverlay.finaleTeaser") : t("revealOverlay.openingTeaser")}</Text>
    </Animated.View>
  );
}

const BOX = 132;

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  boxWrap: {
    width: BOX,
    height: BOX + 18,
    alignItems: "center",
  },
  boxBody: {
    width: BOX,
    height: BOX,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
  },
  cover: { width: "100%", height: "100%" },
  coverPlaceholder: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  lid: {
    position: "absolute",
    top: 0,
    width: BOX + 8,
    height: BOX * 0.42,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: "rgba(30,30,40,0.95)",
    overflow: "hidden",
  },
  lidShine: { flex: 1, opacity: 0.35 },
  seam: {
    position: "absolute",
    top: BOX * 0.4,
    width: BOX - 12,
    height: 3,
    borderRadius: 2,
    opacity: 0.85,
  },
  hint: {
    marginTop: 18,
    color: "rgba(255,255,255,0.75)",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 2,
  },
});

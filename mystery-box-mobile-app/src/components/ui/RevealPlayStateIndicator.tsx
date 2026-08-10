import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useTranslation } from "react-i18next";

export type RevealPlayState = "playing" | "paused" | "accelerating" | "replaying" | "idle";

type Props = {
  visible: boolean;
  state: RevealPlayState;
};

const DOT: Record<RevealPlayState, string> = {
  playing: "#6EE7A8",
  paused: "#FBBF24",
  accelerating: "#60A5FA",
  replaying: "#C084FC",
  idle: "transparent",
};

const FADE_MS = 220;

export function RevealPlayStateIndicator({ visible, state }: Props) {
  const { t } = useTranslation();
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!visible || state === "idle") {
      opacity.value = withTiming(0, { duration: FADE_MS });
      return;
    }
    opacity.value = withTiming(1, { duration: FADE_MS });
  }, [visible, state, opacity]);

  const hostStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!visible || state === "idle") return null;
  const labelKey =
    state === "playing"
      ? "revealOverlay.statePlaying"
      : state === "paused"
        ? "revealOverlay.statePaused"
        : state === "accelerating"
          ? "revealOverlay.stateAccelerating"
          : "revealOverlay.stateReplaying";
  return (
    <Animated.View style={[styles.host, hostStyle]} pointerEvents="none" accessibilityElementsHidden>
      <View style={[styles.dot, { backgroundColor: DOT[state] }]} />
      <Text style={styles.text}>{t(labelKey)}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    top: 96,
    left: 14,
    zIndex: 2190,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.38)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  text: { color: "rgba(255,255,255,0.82)", fontSize: 10, fontWeight: "700" },
});

import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { playStoryboardSting } from "../../effects/sound";
import { revealLayerZIndex } from "../../effects/revealLayerZIndex";

type Props = {
  visible: boolean;
  flashOpacity: SharedValue<number>;
  reduceMotion?: boolean;
  playStings?: boolean;
};

const PACKETS = [
  { left: "8%", delay: 0, duration: 2200, color: "#C41E3A" },
  { left: "22%", delay: 180, duration: 1900, color: "#E53935" },
  { left: "38%", delay: 80, duration: 2400, color: "#C41E3A" },
  { left: "55%", delay: 260, duration: 2100, color: "#D32F2F" },
  { left: "72%", delay: 40, duration: 2000, color: "#C41E3A" },
  { left: "86%", delay: 320, duration: 2300, color: "#E53935" },
];

/** Additive Tết layer: falling red packets + firecracker flash rings. */
export function FestivalRevealLayer({ visible, flashOpacity, reduceMotion = false, playStings = true }: Props) {
  if (!visible || reduceMotion) return null;
  return (
    <View style={styles.host} pointerEvents="none">
      {playStings ? <FestivalStingSync flashOpacity={flashOpacity} /> : null}
      {PACKETS.map((packet, index) => (
        <FallingPacket key={`hongbao-${index}`} {...packet} />
      ))}
      <FirecrackerRing flashOpacity={flashOpacity} size={220} />
      <FirecrackerRing flashOpacity={flashOpacity} size={340} delay={0.12} />
      <Text style={styles.banner}>Tết</Text>
    </View>
  );
}

function FestivalStingSync({ flashOpacity }: { flashOpacity: SharedValue<number> }) {
  useEffect(() => {
    playStoryboardSting("festival", "suspense");
  }, []);
  useAnimatedReaction(
    () => flashOpacity.value,
    (v, prev) => {
      if (v > 0.42 && (prev ?? 0) <= 0.42) {
        runOnJS(playStoryboardSting)("festival", "open");
      }
    },
  );
  return null;
}

function FallingPacket({
  left,
  delay,
  duration,
  color,
}: {
  left: string;
  delay: number;
  duration: number;
  color: string;
}) {
  const fall = useSharedValue(0);
  useEffect(() => {
    fall.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration, easing: Easing.in(Easing.quad) }), -1, false),
    );
  }, [delay, duration, fall]);
  const style = useAnimatedStyle(() => ({
    top: interpolate(fall.value, [0, 1], [-40, 520]),
    opacity: interpolate(fall.value, [0, 0.12, 0.85, 1], [0, 1, 1, 0]),
    transform: [{ rotate: `${interpolate(fall.value, [0, 1], [-12, 18])}deg` }],
  }));
  return (
    <Animated.View style={[styles.packet, { left, backgroundColor: color }, style]}>
      <Text style={styles.packetGlyph}>福</Text>
    </Animated.View>
  );
}

function FirecrackerRing({
  flashOpacity,
  size,
  delay = 0,
}: {
  flashOpacity: SharedValue<number>;
  size: number;
  delay?: number;
}) {
  const style = useAnimatedStyle(() => {
    const peak = Math.max(0, flashOpacity.value - delay);
    return {
      opacity: interpolate(peak, [0, 0.45, 1], [0, 0.7, 0.05]),
      transform: [{ scale: interpolate(peak, [0, 1], [0.35, 1.35]) }],
    };
  });
  return <Animated.View style={[styles.cracker, { width: size, height: size, borderRadius: size / 2 }, style]} />;
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: revealLayerZIndex.backdrop + 50,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  packet: {
    position: "absolute",
    width: 22,
    height: 30,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFD54F",
  },
  packetGlyph: { color: "#FFD54F", fontSize: 11, fontWeight: "800" },
  cracker: {
    position: "absolute",
    borderWidth: 3,
    borderColor: "#FFD54F",
    backgroundColor: "rgba(196,30,58,0.12)",
  },
  banner: {
    position: "absolute",
    top: 28,
    right: 18,
    color: "#FFD54F",
    fontWeight: "800",
    fontSize: 13,
    letterSpacing: 1,
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowRadius: 6,
  },
});

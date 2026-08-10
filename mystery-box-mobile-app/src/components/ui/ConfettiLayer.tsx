import { useMemo } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import { buildConfettiParticles } from "../../effects/burstParticles";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const CONFETTI_COLORS = ["#FFD54F", "#FF8A65", "#81D4FA", "#FFFFFF", "#CE93D8"];

type Props = {
  progress: SharedValue<number>;
  count: number;
  accentColor: string;
  colorPalette?: string[];
};

function ConfettiPiece({
  progress,
  p,
  accentColor,
  palette,
}: {
  progress: SharedValue<number>;
  p: ReturnType<typeof buildConfettiParticles>[number];
  accentColor: string;
  palette: string[];
}) {
  const color = p.colorIndex === 0 ? accentColor : palette[p.colorIndex % palette.length];
  const left = SCREEN_W * 0.5 + p.x * SCREEN_W * 0.42;
  const start = 0.05 + p.delay;
  const end = Math.min(start + 0.85, 1);

  const style = useAnimatedStyle(() => {
    const v = progress.value;
    return {
      opacity: interpolate(v, [0, start, end - 0.15, 1], [0, 0, 1, 0]),
      transform: [
        { translateY: interpolate(v, [0, start, end, 1], [-40, -20, SCREEN_H * 0.55, SCREEN_H * 0.62]) },
        { translateX: interpolate(v, [0, start, end, 1], [0, 0, p.drift, p.drift * 1.1]) },
        { rotate: interpolate(v, [0, 1], [0, 120 + p.id * 40]) + "deg" },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        { left, width: p.size, height: p.size * 0.55, backgroundColor: color },
        style,
      ]}
    />
  );
}

export function ConfettiLayer({ progress, count, accentColor, colorPalette }: Props) {
  const palette = colorPalette && colorPalette.length > 0 ? colorPalette : CONFETTI_COLORS;
  const pieces = useMemo(() => buildConfettiParticles(count), [count]);
  if (count <= 0) return null;

  return (
    <View style={styles.host} pointerEvents="none">
      {pieces.map((p) => (
        <ConfettiPiece
          key={`confetti-${p.id}`}
          progress={progress}
          p={p}
          accentColor={accentColor}
          palette={palette}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
  },
  piece: {
    position: "absolute",
    top: SCREEN_H * 0.2,
    borderRadius: 2,
  },
});

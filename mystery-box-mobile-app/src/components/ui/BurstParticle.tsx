import { StyleSheet } from "react-native";
import Animated, { interpolate, useAnimatedStyle, type SharedValue } from "react-native-reanimated";
import type { BurstParticleSpec } from "../../effects/burstParticles";

function shapeStyle(shape: "dot" | "star" | "shard", size: number) {
  if (shape === "star") {
    return { width: size * 1.4, height: size * 1.4, borderRadius: 2, transform: [{ rotate: "45deg" }] };
  }
  if (shape === "shard") {
    return { width: size * 0.7, height: size * 2.2, borderRadius: 2 };
  }
  return { width: size, height: size * 1.8, borderRadius: 99 };
}

type Props = {
  progress: SharedValue<number>;
  particle: BurstParticleSpec;
  colors: readonly string[];
};

export function BurstParticle({ progress, particle: p, colors }: Props) {
  const color = colors[p.id % colors.length] ?? colors[0] ?? "#ffffff";
  const start = 0.08 + p.delay;
  const end = Math.min(start + 0.75, 1);
  const shape = shapeStyle(p.shape, p.size);

  const style = useAnimatedStyle(() => {
    const v = progress.value;
    const tx = interpolate(v, [0, start, end, 1], [0, 0, Math.cos(p.angle) * p.distance, Math.cos(p.angle) * p.distance * 1.05]);
    const ty = interpolate(v, [0, start, end, 1], [0, 0, Math.sin(p.angle) * p.distance, Math.sin(p.angle) * p.distance * 1.05]);
    return {
      opacity: interpolate(v, [0, start, end - 0.1, 1], [0, 0, 1, 0]),
      transform: [{ translateX: tx }, { translateY: ty }, { scale: interpolate(v, [0, start, end], [0.2, 0.5, 1.2]) }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        shape,
        {
          backgroundColor: color,
          shadowColor: color,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  particle: {
    position: "absolute",
    shadowOpacity: 0.95,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
});

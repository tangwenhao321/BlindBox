import type { WithSpringConfig } from "react-native-reanimated";

/** 将 RN Animated spring(friction, tension) 近似映射为 Reanimated spring */
export function rnSpring(friction: number, tension: number): WithSpringConfig {
  return {
    damping: Math.max(4, friction * 4),
    stiffness: tension,
    mass: 1,
  };
}

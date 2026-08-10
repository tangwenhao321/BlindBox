import { useEffect } from "react";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

type Props = {
  visible: boolean;
  progress: number;
  accentColor?: string;
};

/** Edge progress ring while long-pressing to accelerate. */
export function RevealAccelerateRing({ visible, progress, accentColor = "#FFD678" }: Props) {
  const ring = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      cancelAnimation(ring);
      ring.value = 0;
      return;
    }
    ring.value = withTiming(Math.min(1, Math.max(0, progress)), {
      duration: 80,
      easing: Easing.linear,
    });
  }, [visible, progress, ring]);

  const style = useAnimatedStyle(() => ({
    opacity: visible ? 0.85 : 0,
    transform: [{ scale: 1 + ring.value * 0.04 }],
    borderColor: accentColor,
    borderWidth: 2 + ring.value * 2,
  }));

  if (!visible) return null;

  return <Animated.View style={[styles.ring, style]} pointerEvents="none" />;
}

const styles = {
  ring: {
    position: "absolute" as const,
    top: 24,
    left: 24,
    right: 24,
    bottom: 24,
    borderRadius: 24,
  },
};

import { useEffect } from "react";
import { View, type ViewStyle } from "react-native";
import { useReduceMotion } from "../hooks/useReduceMotion";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { rnSpring } from "../effects/reanimated/springConfig";

type Props = {
  delay?: number;
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
};

export function AnimatedRevealCard({ delay = 0, style, children }: Props) {
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(14);
  const scale = useSharedValue(0.985);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      translateY.value = 0;
      scale.value = 1;
      return;
    }
    opacity.value = withDelay(delay, withTiming(1, { duration: 280 }));
    translateY.value = withDelay(delay, withSpring(0, rnSpring(11, 70)));
    scale.value = withDelay(delay, withTiming(1, { duration: 260 }));
  }, [delay, opacity, translateY, scale, reduceMotion]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  if (reduceMotion) {
    return <View style={style}>{children}</View>;
  }

  return <Animated.View style={[style, animStyle]}>{children}</Animated.View>;
}

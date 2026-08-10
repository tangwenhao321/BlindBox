import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

type Props = {
  trigger: number;
  color?: string;
};

export function RevealTouchRipple({ trigger, color = "rgba(255,255,255,0.35)" }: Props) {
  const scale = useSharedValue(0.4);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (trigger <= 0) return;
    opacity.value = 0.55;
    scale.value = 0.35;
    scale.value = withSequence(withTiming(1.6, { duration: 320 }), withTiming(1.65, { duration: 80 }));
    opacity.value = withSequence(withTiming(0.35, { duration: 200 }), withTiming(0, { duration: 220 }));
  }, [trigger, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (trigger <= 0) return null;

  return (
    <View style={styles.host} pointerEvents="none">
      <Animated.View style={[styles.ripple, { borderColor: color }, style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  ripple: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
  },
});

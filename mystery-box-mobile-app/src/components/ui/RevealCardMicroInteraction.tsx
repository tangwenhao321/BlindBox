import type { ReactNode } from "react";
import { Pressable, type PressableProps, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { rnSpring } from "../../effects/reanimated/springConfig";

type Props = PressableProps & {
  children: ReactNode;
  disabled?: boolean;
  pressScale?: number;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function RevealCardMicroInteraction({
  children,
  disabled,
  pressScale = 0.97,
  style,
  onPressIn,
  onPressOut,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      style={[style, animStyle, disabled ? styles.disabled : null]}
      onPressIn={(e) => {
        if (!disabled) scale.value = withSpring(pressScale, rnSpring(8, 220));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, rnSpring(6, 140));
        onPressOut?.(e);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.45 },
});

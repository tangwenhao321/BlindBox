import { useEffect } from "react";
import { cancelAnimation, Easing, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

/** 0↔1 循环脉冲，用于按钮呼吸、光晕等 */
export function useLoopPulse(active: boolean, durationMs = 700) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      cancelAnimation(pulse);
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: durationMs, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: durationMs, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(pulse);
  }, [active, durationMs, pulse]);

  return pulse;
}

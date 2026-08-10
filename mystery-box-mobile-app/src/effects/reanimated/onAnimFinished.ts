import { runOnJS, type AnimationCallback } from "react-native-reanimated";

/** Reanimated 4 worklet-safe completion callback (do not call JS functions from withTiming directly). */
export function onAnimFinished(cb: () => void): AnimationCallback {
  return (finished?: boolean) => {
    "worklet";
    if (finished) {
      runOnJS(cb)();
    }
  };
}

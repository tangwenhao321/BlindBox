import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { RemoteImage } from "./RemoteImage";

type Props = {
  visible: boolean;
  boxCoverUri?: string;
  timedOut?: boolean;
};

/** Weak-network skeleton: subtle box wobble while prizes load. */
export function RevealLoadingTeaser({ visible, boxCoverUri, timedOut }: Props) {
  const { t } = useTranslation();
  const wobble = useSharedValue(0);

  useEffect(() => {
    if (!visible || timedOut) {
      cancelAnimation(wobble);
      return;
    }
    wobble.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 90, easing: Easing.linear }),
        withTiming(-1, { duration: 90, easing: Easing.linear }),
      ),
      -1,
      true,
    );
    return () => cancelAnimation(wobble);
  }, [visible, timedOut, wobble]);

  const boxStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${wobble.value * 3}deg` }],
  }));

  if (!visible) return null;

  return (
    <View style={styles.host} pointerEvents="none">
      <Animated.View style={[styles.boxWrap, boxStyle]}>
        {boxCoverUri ? (
          <RemoteImage uri={boxCoverUri} style={styles.boxImage} contentFit="cover" />
        ) : (
          <View style={styles.boxPlaceholder} />
        )}
      </Animated.View>
      <Text style={styles.hint}>
        {timedOut ? t("revealOverlay.loadingTimeout") : t("revealOverlay.loadingPrizes")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 12,
  },
  boxWrap: {
    width: 96,
    height: 96,
    borderRadius: 16,
    overflow: "hidden",
  },
  boxImage: { width: "100%", height: "100%" },
  boxPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  hint: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});

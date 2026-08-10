import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { pickCopyPoolKey } from "../../effects/revealCopyPool";
import { getRevealRemoteConfig } from "../../effects/revealRemote";

type Props = {
  visible: boolean;
  segmentIndex: number;
  segmentTotal: number;
  orderId?: string;
  onDone: () => void;
};

export function RevealBatchBeat({ visible, segmentIndex, segmentTotal, orderId, onDone }: Props) {
  const { t } = useTranslation();
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.92);
  const remote = getRevealRemoteConfig();
  const poolSize = remote.copyPoolSizes.finale ?? 4;
  const copyKey = pickCopyPoolKey("batchBeat", poolSize, `${orderId ?? "x"}:${segmentIndex}`);
  const copy = t(`orderResult.${copyKey}`, { defaultValue: t("orderResult.batchBeatDefault") });

  useEffect(() => {
    if (!visible) return;
    const ms = getRevealRemoteConfig().batchBeatMs;
    opacity.value = withSequence(
      withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: Math.max(200, ms - 440) }),
      withTiming(0, { duration: 220 }),
    );
    scale.value = withSequence(
      withTiming(1.04, { duration: 260, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 180 }),
    );
    const timer = setTimeout(onDone, ms);
    return () => clearTimeout(timer);
  }, [visible, segmentIndex, onDone, opacity, scale]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!visible) return null;

  return (
    <View style={styles.host} pointerEvents="none">
      <Animated.View style={[styles.card, animStyle]}>
        <Text style={styles.kicker}>
          {t("orderResult.batchBeatKicker", { current: segmentIndex, total: segmentTotal })}
        </Text>
        <Text style={styles.title}>{copy}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 40,
  },
  card: {
    paddingHorizontal: 28,
    paddingVertical: 20,
    borderRadius: 20,
    backgroundColor: "rgba(12, 10, 28, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    maxWidth: "86%",
  },
  kicker: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 8,
  },
  title: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
});

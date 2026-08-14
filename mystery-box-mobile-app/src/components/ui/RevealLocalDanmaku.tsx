import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { subscribeRevealRoomReactions } from "../../effects/revealSocialRoom";
import { getRuntimeRevealDanmakuEnabled } from "../../utils/revealSettings";
import { revealLayerZIndex } from "../../effects/revealLayerZIndex";

const PRESET_KEYS = ["nice", "wow", "again", "lucky"] as const;
const DRIFT_PX = 28;

type Props = {
  visible: boolean;
  replayOnly?: boolean;
  useRoomReactions?: boolean;
};

export function RevealLocalDanmaku({ visible, replayOnly = true, useRoomReactions = false }: Props) {
  const { t } = useTranslation();
  const [tick, setTick] = useState(0);
  const [roomEmoji, setRoomEmoji] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const driftX = useRef(new Animated.Value(0)).current;
  const enabled = getRuntimeRevealDanmakuEnabled();

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => setReduceMotion(false));
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", setReduceMotion);
    return () => {
      sub?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (!visible || !enabled || !useRoomReactions) return undefined;
    return subscribeRevealRoomReactions((rows) => {
      setRoomEmoji(rows[0]?.emoji ?? null);
    });
  }, [visible, enabled, useRoomReactions]);

  useEffect(() => {
    if (!visible || !enabled || (replayOnly && !visible)) return undefined;
    const id = setInterval(() => setTick((v) => v + 1), 2400);
    return () => clearInterval(id);
  }, [visible, enabled, replayOnly]);

  useEffect(() => {
    if (!visible || !enabled || reduceMotion) {
      driftX.stopAnimation();
      driftX.setValue(0);
      return undefined;
    }
    driftX.setValue(-DRIFT_PX);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(driftX, {
          toValue: DRIFT_PX,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(driftX, {
          toValue: -DRIFT_PX,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      driftX.setValue(0);
    };
  }, [visible, enabled, reduceMotion, driftX]);

  const line = useMemo(() => {
    if (useRoomReactions && roomEmoji) return roomEmoji;
    const key = PRESET_KEYS[tick % PRESET_KEYS.length];
    return t(`revealDanmaku.${key}`);
  }, [tick, t, useRoomReactions, roomEmoji]);

  if (!visible || !enabled) return null;

  return (
    <View style={styles.host} pointerEvents="none" testID="revealLocalDanmaku">
      <Animated.Text
        style={[styles.text, reduceMotion ? null : { transform: [{ translateX: driftX }] }]}
        numberOfLines={1}
      >
        {line}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    top: "38%",
    left: 12,
    right: 12,
    zIndex: revealLayerZIndex.badge,
    alignItems: "center",
  },
  text: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 13,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { subscribeRevealRoomReactions } from "../../effects/revealSocialRoom";
import { getRuntimeRevealDanmakuEnabled } from "../../utils/revealSettings";
import { revealLayerZIndex } from "../../effects/revealLayerZIndex";

const PRESET_KEYS = ["nice", "wow", "again", "lucky"] as const;

type Props = {
  visible: boolean;
  replayOnly?: boolean;
  useRoomReactions?: boolean;
};

export function RevealLocalDanmaku({ visible, replayOnly = true, useRoomReactions = false }: Props) {
  const { t } = useTranslation();
  const [tick, setTick] = useState(0);
  const [roomEmoji, setRoomEmoji] = useState<string | null>(null);
  const enabled = getRuntimeRevealDanmakuEnabled();

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

  const line = useMemo(() => {
    if (useRoomReactions && roomEmoji) return roomEmoji;
    const key = PRESET_KEYS[tick % PRESET_KEYS.length];
    return t(`revealDanmaku.${key}`, { defaultValue: key });
  }, [tick, t, useRoomReactions, roomEmoji]);

  if (!visible || !enabled) return null;

  return (
    <View style={styles.host} pointerEvents="none" testID="revealLocalDanmaku">
      <Text style={styles.text} numberOfLines={1}>
        {line}
      </Text>
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

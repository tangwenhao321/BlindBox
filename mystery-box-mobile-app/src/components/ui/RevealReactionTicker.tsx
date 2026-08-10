import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { subscribeRevealRoomReactions, type RoomReaction } from "../../effects/revealSocialRoom";

type Props = {
  visible?: boolean;
  testID?: string;
};

export function RevealReactionTicker({ visible = true, testID = "revealReactionTicker" }: Props) {
  const [reactions, setReactions] = useState<RoomReaction[]>([]);

  useEffect(() => {
    return subscribeRevealRoomReactions(setReactions);
  }, []);

  if (!visible) return null;

  return (
    <View style={styles.host} pointerEvents="none" testID={testID}>
      {reactions.length === 0 ? (
        <View style={styles.placeholder} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {reactions.slice(0, 12).map((item) => (
            <View key={`${item.memberId}-${item.ts}`} style={styles.chip}>
              <Text style={styles.emoji}>{item.emoji}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 24,
    paddingHorizontal: 12,
    minHeight: 36,
  },
  placeholder: { minHeight: 36 },
  row: { gap: 8, alignItems: "center" },
  chip: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  emoji: { fontSize: 18 },
});

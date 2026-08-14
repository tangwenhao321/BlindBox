import { useEffect } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import type { RevealAchievement } from "../../effects/revealAchievements";
import { trackEffectEvent } from "../../effects/telemetry";
import { TOAST_ACHIEVEMENT_MS } from "../../utils/toast";

type Props = {
  achievement: RevealAchievement | null;
  onDismiss: () => void;
  onOpenCollection?: () => void;
};

export function RevealAchievementToast({ achievement, onDismiss, onOpenCollection }: Props) {
  const { t } = useTranslation();
  const y = useSharedValue(40);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!achievement) return;
    trackEffectEvent("reveal_achievement_show", { kind: achievement.kind });
    y.value = withSpring(0, { damping: 14, stiffness: 160 });
    opacity.value = withTiming(1, { duration: 220 });
    const timer = setTimeout(onDismiss, TOAST_ACHIEVEMENT_MS);
    return () => clearTimeout(timer);
  }, [achievement, onDismiss, opacity, y]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));

  if (!achievement) return null;

  return (
    <Animated.View style={[styles.host, style]} pointerEvents="box-none">
      <Pressable style={styles.card} onPress={onOpenCollection} accessibilityRole="button">
        <Text style={styles.title}>{t(achievement.titleKey)}</Text>
        <Text style={styles.body}>{t(achievement.bodyKey)}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 120,
    zIndex: 60,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: "rgba(20,16,40,0.92)",
    borderWidth: 1,
    borderColor: "rgba(255,215,120,0.35)",
  },
  title: { color: "#ffe7a8", fontWeight: "700", fontSize: 15, marginBottom: 4 },
  body: { color: "rgba(255,255,255,0.82)", fontSize: 13 },
});

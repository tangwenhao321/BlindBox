import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { RevealStoryboardLayer } from "./RevealStoryboardLayer";
import { storyboardBackdrop, storyboardFromCatalogKey } from "../../effects/revealStoryboard";
import type { UnlockableThemeKey } from "../../effects/revealThemeRotation";

const LOOP_MS = 2800;

type Props = {
  themeKey: UnlockableThemeKey;
  onClose: () => void;
};

/** 2–3s looping storyboard preview for Effects Center (no prize payload). */
export function StoryboardPreviewHost({ themeKey, onClose }: Props) {
  const { t } = useTranslation();
  const storyboard = storyboardFromCatalogKey(themeKey);
  const cardFlip = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const charge = useSharedValue(0);

  useEffect(() => {
    const play = () => {
      cancelAnimation(cardFlip);
      cancelAnimation(flashOpacity);
      cancelAnimation(charge);
      cardFlip.value = 0;
      flashOpacity.value = 0;
      charge.value = 0;
      charge.value = withSequence(
        withTiming(1, { duration: 720, easing: Easing.out(Easing.cubic) }),
        withTiming(0.2, { duration: 280 }),
        withTiming(0, { duration: 1800 }),
      );
      flashOpacity.value = withSequence(
        withTiming(0, { duration: 700 }),
        withTiming(1, { duration: 160 }),
        withTiming(0.12, { duration: 280 }),
        withTiming(0, { duration: 1660 }),
      );
      cardFlip.value = withSequence(
        withTiming(0, { duration: 820 }),
        withTiming(1, { duration: 720, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 900 }),
        withTiming(0, { duration: 360 }),
      );
    };
    play();
    const id = setInterval(play, LOOP_MS);
    return () => {
      clearInterval(id);
      cancelAnimation(cardFlip);
      cancelAnimation(flashOpacity);
      cancelAnimation(charge);
    };
  }, [cardFlip, charge, flashOpacity, themeKey]);

  const chargeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(charge.value, [0, 1], [0.25, 0.9]),
    transform: [{ scale: interpolate(charge.value, [0, 1], [0.86, 1.12]) }],
  }));

  return (
    <View style={styles.host} accessibilityRole="summary">
      <LinearGradient colors={storyboardBackdrop(storyboard)} style={StyleSheet.absoluteFill} />
      {storyboard === "classic" ? (
        <Animated.View style={[styles.classicRing, chargeStyle]} />
      ) : (
        <RevealStoryboardLayer
          visible
          storyboard={storyboard}
          cardFlip={cardFlip}
          flashOpacity={flashOpacity}
          prizeName={t(`effectsCenter.theme_${themeKey}`)}
          rarityRings={2}
          density="full"
          playStings={false}
        />
      )}
      <Text style={styles.label}>{t("effectsCenter.previewLabel", { name: t(`effectsCenter.theme_${themeKey}`) })}</Text>
      <Pressable
        onPress={onClose}
        style={({ pressed }) => [styles.close, pressed ? styles.pressed : null]}
        accessibilityRole="button"
        accessibilityLabel={t("common.close")}
      >
        <Text style={styles.closeText}>{t("common.close")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 12,
    justifyContent: "flex-end",
  },
  classicRing: {
    position: "absolute",
    alignSelf: "center",
    top: 48,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "rgba(180,200,255,0.7)",
  },
  label: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  close: {
    alignSelf: "flex-start",
    marginLeft: 12,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  closeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  pressed: { opacity: 0.85 },
});

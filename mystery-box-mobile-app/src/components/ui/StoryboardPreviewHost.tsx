import { useEffect } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
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
import { OptionalLottieBurst } from "./OptionalLottieBurst";
import { CinematicRevealLayer } from "./CinematicRevealLayer";
import { storyboardBackdrop, storyboardFromCatalogKey } from "../../effects/revealStoryboard";
import {
  playStoryboardSting,
  playThemePreviewAudio,
  stopThemePreviewAudio,
} from "../../effects/sound";
import type { UnlockableThemeKey } from "../../effects/revealThemeRotation";

const LOOP_MS = 4200;

type Props = {
  themeKey: UnlockableThemeKey;
  onClose: () => void;
};

/** Full-screen looping storyboard preview for Effects Center. */
export function StoryboardPreviewHost({ themeKey, onClose }: Props) {
  const { t } = useTranslation();
  const storyboard = storyboardFromCatalogKey(themeKey);
  const cardFlip = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const charge = useSharedValue(0);

  useEffect(() => {
    void playThemePreviewAudio(themeKey);
    const play = () => {
      cancelAnimation(cardFlip);
      cancelAnimation(flashOpacity);
      cancelAnimation(charge);
      cardFlip.value = 0;
      flashOpacity.value = 0;
      charge.value = 0;
      charge.value = withSequence(
        withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }),
        withTiming(0.18, { duration: 360 }),
        withTiming(0, { duration: 2940 }),
      );
      flashOpacity.value = withSequence(
        withTiming(0, { duration: 780 }),
        withTiming(1, { duration: 180 }),
        withTiming(0.14, { duration: 320 }),
        withTiming(0, { duration: 2920 }),
      );
      cardFlip.value = withSequence(
        withTiming(0, { duration: 720 }),
        withTiming(1, { duration: 860, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 1680 }),
        withTiming(0, { duration: 940 }),
      );
    };
    play();
    const id = setInterval(() => {
      play();
      void playThemePreviewAudio(themeKey);
      playStoryboardSting(storyboard, "open", { force: true });
    }, LOOP_MS);
    return () => {
      clearInterval(id);
      cancelAnimation(cardFlip);
      cancelAnimation(flashOpacity);
      cancelAnimation(charge);
      stopThemePreviewAudio();
    };
  }, [cardFlip, charge, flashOpacity, storyboard, themeKey]);

  const chargeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(charge.value, [0, 1], [0.22, 1]),
    transform: [{ scale: interpolate(charge.value, [0, 1], [0.78, 1.16]) }],
  }));

  const lottieTier =
    themeKey === "party"
      ? "TREASURE_LEGEND"
      : themeKey === "cyberpunk"
        ? "HIDDEN"
        : themeKey === "adventure"
          ? "LEGENDARY"
          : "GENERAL";

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.modalRoot}>
        <LinearGradient colors={storyboardBackdrop(storyboard)} style={StyleSheet.absoluteFill} />
        <View style={styles.stage} pointerEvents="none">
          {storyboard === "classic" ? (
            <View style={styles.classicStage}>
              <Animated.View style={[styles.classicHalo, chargeStyle]} />
              <Animated.View style={[styles.classicRing, chargeStyle]} />
              <Animated.View style={[styles.classicRingInner, chargeStyle]} />
              <View style={styles.classicSparkA} />
              <View style={styles.classicSparkB} />
              <View style={styles.classicSparkC} />
              <OptionalLottieBurst tier="GENERAL" visible loop fullscreen />
            </View>
          ) : (
            <>
              <RevealStoryboardLayer
                visible
                storyboard={storyboard}
                cardFlip={cardFlip}
                flashOpacity={flashOpacity}
                prizeName={t(`effectsCenter.theme_${themeKey}`)}
                rarityRings={4}
                density="full"
                playStings
              />
              <OptionalLottieBurst tier={lottieTier} visible loop fullscreen />
            </>
          )}
          <CinematicRevealLayer storyboard={storyboard} />
        </View>
        <View style={styles.chrome} pointerEvents="box-none">
          <Text style={styles.kicker}>{t("effectsCenter.preview")}</Text>
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: "#07060C",
  },
  stage: {
    ...StyleSheet.absoluteFillObject,
  },
  classicStage: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  classicHalo: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(196,165,116,0.2)",
  },
  classicRing: {
    position: "absolute",
    width: 188,
    height: 188,
    borderRadius: 94,
    borderWidth: 3,
    borderColor: "rgba(224,196,138,0.9)",
    shadowColor: "#E0C48A",
    shadowOpacity: 0.95,
    shadowRadius: 28,
  },
  classicRingInner: {
    position: "absolute",
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 1,
    borderColor: "rgba(255,236,179,0.55)",
  },
  classicSparkA: {
    position: "absolute",
    top: "32%",
    left: "22%",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFE082",
  },
  classicSparkB: {
    position: "absolute",
    top: "36%",
    right: "18%",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFF8E1",
  },
  classicSparkC: {
    position: "absolute",
    top: "58%",
    left: "16%",
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#E0C48A",
  },
  chrome: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 18,
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.32)",
  },
  kicker: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  label: {
    color: "rgba(255,255,255,0.96)",
    fontSize: 20,
    fontWeight: "800",
  },
  close: {
    alignSelf: "flex-start",
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  closeText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  pressed: { opacity: 0.85 },
});

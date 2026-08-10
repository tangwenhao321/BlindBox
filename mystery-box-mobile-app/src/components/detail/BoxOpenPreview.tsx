import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useTranslation } from "react-i18next";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useAppTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { RemoteImage } from "../ui/RemoteImage";
import { resolveBoxImageUrl } from "../../utils/boxImage";
import type { MysteryBox } from "../../types";
import { radius, spacing } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
import { rnSpring } from "../../effects/reanimated/springConfig";

type Props = {
  box: MysteryBox;
  onPress?: () => void;
  onHoldPreviewStart?: () => void;
  onHoldPreviewEnd?: () => void;
};

const HOLD_MS = 420;

/** 详情页轻量「试开」动效（不消耗库存） */
export function BoxOpenPreview({ box, onPress, onHoldPreviewStart, onHoldPreviewEnd }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildPreviewStyles);
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  const size = isTablet ? 96 : 72;
  const pulse = useSharedValue(0);
  const lid = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(pulse);
  }, [pulse]);

  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdingPreviewRef = useRef(false);
  const suppressPressRef = useRef(false);

  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  const clearHoldTimer = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const onPressIn = () => {
    lid.value = withSpring(1, rnSpring(5, 160));
    suppressPressRef.current = false;
    clearHoldTimer();
    holdTimerRef.current = setTimeout(() => {
      holdingPreviewRef.current = true;
      suppressPressRef.current = true;
      onHoldPreviewStart?.();
    }, HOLD_MS);
  };

  const onPressOut = () => {
    lid.value = withSpring(0, rnSpring(6, 120));
    clearHoldTimer();
    if (holdingPreviewRef.current) {
      holdingPreviewRef.current = false;
      onHoldPreviewEnd?.();
    }
  };

  const handlePress = () => {
    if (suppressPressRef.current) {
      suppressPressRef.current = false;
      return;
    }
    onPress?.();
  };

  const boxStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.04]) }],
  }));

  const lidStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(lid.value, [0, 1], [0, -14]) }],
  }));

  const cover = resolveBoxImageUrl(box);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      delayLongPress={HOLD_MS}
      style={styles.wrap}
      accessibilityRole="button"
      accessibilityLabel={t("boxDetails.previewA11y")}
    >
      <Animated.View style={[styles.box, { width: size, height: size + 10 }, boxStyle]}>
        <LinearGradient colors={["#2d2d3a", "#12121a"]} style={[styles.body, { width: size, height: size }]}>
          <RemoteImage uri={cover} style={styles.img} contentFit="cover" />
        </LinearGradient>
        <Animated.View style={[styles.lid, { width: size + 4, height: size * 0.38 }, lidStyle]}>
          <LinearGradient colors={[colors.brand, "#6eb6ff"]} style={styles.lidFill} />
        </Animated.View>
      </Animated.View>
      <Text style={styles.hint}>{t("boxDetails.previewHint")}</Text>
    </Pressable>
  );
}

function buildPreviewStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { alignItems: "center", marginVertical: spacing.sm },
    box: { alignItems: "center" },
    body: {
      borderRadius: radius.md,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.2)",
    },
    img: { width: "100%", height: "100%" },
    lid: {
      position: "absolute",
      top: 0,
      borderRadius: radius.sm,
      overflow: "hidden",
    },
    lidFill: { flex: 1, opacity: 0.85 },
    hint: { marginTop: 6, fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  });
}

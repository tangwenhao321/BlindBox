import { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { useTranslation } from "react-i18next";
import { parseError } from "../../api";
import { requestBoxHint, type HintResult } from "../../services/hintService";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
import { qualityLabelFromRaw } from "../../utils/quality";

type Props = {
  visible: boolean;
  token: string;
  boxId: string;
  onClose: () => void;
  onHintResult?: (result: HintResult) => void;
};

export function CabinetShakeSheet({ visible, token, boxId, onClose, onHintResult }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildShakeSheetStyles);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HintResult | null>(null);
  const shakeX = useSharedValue(0);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
    shakeX.value = 0;
  }, [shakeX]);

  useEffect(() => {
    if (!visible) reset();
  }, [visible, reset]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const runShake = () => {
    shakeX.value = withSequence(
      withTiming(-8, { duration: 45 }),
      withTiming(8, { duration: 45 }),
      withTiming(-5, { duration: 45 }),
      withTiming(5, { duration: 45 }),
      withTiming(0, { duration: 45 }),
    );
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const requestHint = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await requestBoxHint(token, boxId);
      setResult(next);
      onHintResult?.(next);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError(parseError(e));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const onShake = () => {
    runShake();
    void requestHint();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.mask} onPress={onClose} accessibilityLabel={t("cabinet.shakeCloseA11y")}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>{t("cabinet.shakeTitle")}</Text>
          <Text style={styles.sub}>{t("cabinet.shakeSubtitle")}</Text>

          {result?.excludedQualityType ? (
            <View style={styles.resultBox}>
              <Text style={styles.resultLabel}>{t("cabinet.hintExcluded", {
                quality: qualityLabelFromRaw(result.excludedQualityType, t),
              })}</Text>
            </View>
          ) : null}

          {result ? (
            <Text style={styles.meta}>
              {t("cabinet.hintRemaining", {
                count: result.hintsRemaining,
                cards: result.hintCardsRemaining,
              })}
            </Text>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("cabinet.shakeCtaA11y")}
            disabled={loading}
            onPress={onShake}
          >
            <Animated.View style={[styles.shakeBox, shakeStyle]}>
              <Ionicons name="cube" size={36} color={styles.shakeText.color} />
              <Text style={styles.shakeText}>{loading ? t("cabinet.shakeLoading") : t("cabinet.shakeCta")}</Text>
            </Animated.View>
          </Pressable>

          <Pressable
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t("cabinet.shakeClose")}
          >
            <Text style={styles.closeText}>{t("cabinet.shakeClose")}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function buildShakeSheetStyles(colors: ThemeColors) {
  return StyleSheet.create({
    mask: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
    sheet: {
      backgroundColor: colors.bgCard,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.sm,
    },
    handle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: spacing.sm,
    },
    title: { fontWeight: "900", fontSize: typography.h3, color: colors.textPrimary },
    sub: { fontSize: typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
    resultBox: {
      backgroundColor: colors.bgBrandSoft,
      borderRadius: radius.md,
      padding: spacing.md,
      alignItems: "center",
    },
    resultLabel: { fontSize: typography.body, fontWeight: "800", color: colors.brand },
    meta: { textAlign: "center", fontSize: typography.caption, color: colors.textSecondary },
    error: { color: colors.danger, fontSize: typography.caption, textAlign: "center" },
    shakeBox: {
      marginTop: spacing.md,
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
      paddingVertical: spacing.lg,
      alignItems: "center",
      gap: spacing.xs,
    },
    shakeText: { color: colors.textOnBrand, fontWeight: "800" },
    closeBtn: { alignItems: "center", paddingVertical: spacing.sm },
    closeText: { color: colors.textMuted, fontWeight: "700" },
  });
}

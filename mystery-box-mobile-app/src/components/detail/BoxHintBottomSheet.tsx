import { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { parseError } from "../../api";
import { requestBoxHint, type HintResult } from "../../services/hintService";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { useAppTheme } from "../../context/ThemeContext";
import { radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
import { qualityLabelFromRaw } from "../../utils/quality";
import { trackEvent } from "../../utils/analytics";

type Props = {
  visible: boolean;
  token: string;
  boxId: string;
  onClose: () => void;
};

export function BoxHintBottomSheet({ visible, token, boxId, onClose }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildHintSheetStyles);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HintResult | null>(null);
  const [shakeHint, setShakeHint] = useState(false);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
    setShakeHint(false);
  }, []);

  useEffect(() => {
    if (!visible) reset();
  }, [visible, reset]);

  const requestHint = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await requestBoxHint(token, boxId);
      setResult(next);
      trackEvent("hint_use", { boxId, excluded: next.excludedQualityTypes?.length ?? 0 });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setError(parseError(e));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const onShake = () => {
    setShakeHint(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => setShakeHint(false), 400);
    void requestHint();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.mask} onPress={onClose} accessibilityLabel={t("boxDetails.hintCloseA11y")}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Text style={styles.title}>{t("boxDetails.hintTitle")}</Text>
          <Text style={styles.sub}>{t("boxDetails.hintSubtitle")}</Text>

          {result?.excludedQualityType ? (
            <View style={styles.resultBox}>
              <Text style={styles.resultLabel}>{t("boxDetails.hintExcluded")}</Text>
              <Text style={styles.resultValue}>
                {qualityLabelFromRaw(result.excludedQualityType, t)}
              </Text>
            </View>
          ) : null}

          {result ? (
            <Text style={styles.meta}>
              {t("boxDetails.hintRemaining", {
                hints: result.hintsRemaining,
                cards: result.hintCardsRemaining,
              })}
            </Text>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.shakeBtn, shakeHint ? styles.shakeActive : null]}
            accessibilityRole="button"
            accessibilityLabel={t("boxDetails.hintShakeA11y")}
            disabled={loading}
            onPress={onShake}
          >
            <Ionicons
              name="phone-portrait-outline"
              size={22}
              color={colors.textOnBrand}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
            <Text style={styles.shakeText}>{loading ? t("boxDetails.hintLoading") : t("boxDetails.hintShakeCta")}</Text>
          </Pressable>

          <Pressable
            style={styles.closeBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t("boxDetails.hintClose")}
          >
            <Text style={styles.closeText}>{t("boxDetails.hintClose")}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function buildHintSheetStyles(colors: ThemeColors) {
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
    resultLabel: { fontSize: typography.micro, color: colors.textMuted },
    resultValue: { fontSize: typography.h2, fontWeight: "900", color: colors.brand, marginTop: 4 },
    meta: { textAlign: "center", fontSize: typography.caption, color: colors.textSecondary },
    error: { color: colors.danger, fontSize: typography.caption, textAlign: "center" },
    shakeBtn: {
      marginTop: spacing.md,
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
      paddingVertical: spacing.md,
      alignItems: "center",
      gap: spacing.xs,
    },
    shakeActive: { opacity: 0.85, transform: [{ scale: 0.98 }] },
    shakeText: { color: colors.textOnBrand, fontWeight: "800" },
    closeBtn: { alignItems: "center", paddingVertical: spacing.sm },
    closeText: { color: colors.textMuted, fontWeight: "700" },
  });
}

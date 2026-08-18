import { useEffect, useRef, useState } from "react";
import { Animated, Modal, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { layout, radius, shadows, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
import { subscribeToast } from "../../utils/toast";

type Props = {
  /** Render above full-screen modals (e.g. login). */
  elevated?: boolean;
};

/** RN Animated only — avoid Reanimated on Honor/Harmony where worklets break first paint. */
export function ToastHost({ elevated = false }: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildToastHostStyles);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" | "revealHint" } | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(
    () =>
      subscribeToast((next) => {
        if (!next) {
          Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(({ finished }) => {
            if (finished) setToast(null);
          });
          return;
        }
        setToast({ message: next.message, type: next.type });
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      }),
    [opacity],
  );

  if (!toast) {
    return null;
  }

  const palette =
    toast.type === "success"
      ? { bg: colors.successSoft, border: colors.successSoftBorder, text: colors.successStrong }
      : toast.type === "error"
        ? { bg: colors.warningSoft, border: colors.warningSoftBorder, text: colors.warning }
        : toast.type === "revealHint"
          ? { bg: colors.bgBrandSoft, border: colors.border, text: colors.brand }
          : { bg: colors.infoSoft, border: colors.infoSoftBorder, text: colors.link };

  const content = (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, elevated ? styles.wrapElevated : null, { opacity }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      accessibilityLabel={toast.message}
      importantForAccessibility="yes"
    >
      <View style={[styles.card, { backgroundColor: palette.bg, borderColor: palette.border }]}>
        <Text style={[styles.text, { color: palette.text }]}>{toast.message}</Text>
      </View>
    </Animated.View>
  );

  if (!elevated) {
    return content;
  }

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={() => undefined}>
      <View style={styles.modalRoot} pointerEvents="box-none">
        {content}
      </View>
    </Modal>
  );
}

function buildToastHostStyles(_colors: ThemeColors) {
  return StyleSheet.create({
    modalRoot: { flex: 1, justifyContent: "flex-end" },
    wrap: {
      position: "absolute",
      left: layout.screenPaddingX,
      right: layout.screenPaddingX,
      bottom: layout.screenPaddingBottom - 12,
      zIndex: 999,
    },
    wrapElevated: {
      position: "relative",
      left: undefined,
      right: undefined,
      bottom: undefined,
      marginHorizontal: layout.screenPaddingX,
      marginBottom: layout.screenPaddingBottom,
    },
    card: {
      borderRadius: radius.md,
      borderWidth: 1,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      ...shadows.cardSm,
    },
    text: { fontSize: typography.body, fontWeight: "800", textAlign: "center", lineHeight: 20 },
  });
}

import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
import { markRevealCoachSeen, shouldShowRevealCoach } from "../../utils/revealCoachStorage";

type Props = {
  /** When true, tip may appear (reveal overlay / settlement first mount). */
  active: boolean;
};

const STEPS = [
  { titleKey: "revealCoach.skipTitle", bodyKey: "revealCoach.skipBody" },
  { titleKey: "revealCoach.shareTitle", bodyKey: "revealCoach.shareBody" },
] as const;

/**
 * Lightweight first-reveal coach: skip gesture, then settlement share.
 * Shown once when `active` becomes true and `reveal_coach_seen` is unset.
 */
export function RevealCoachTips({ active }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildStyles);
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    void shouldShowRevealCoach().then((show) => {
      if (!cancelled && show) setVisible(true);
    });
    return () => {
      cancelled = true;
    };
  }, [active]);

  const finish = async () => {
    setVisible(false);
    await markRevealCoachSeen();
  };

  const next = async () => {
    if (step >= STEPS.length - 1) {
      await finish();
      return;
    }
    setStep((s) => s + 1);
  };

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step >= STEPS.length - 1;

  return (
    <View style={styles.mask} pointerEvents="box-none" testID="revealCoachTips">
      <Pressable style={styles.card} onPress={next} accessibilityRole="button">
        <Text style={styles.kicker}>{t("revealCoach.kicker")}</Text>
        <Text style={styles.title}>{t(current.titleKey)}</Text>
        <Text style={styles.body}>{t(current.bodyKey)}</Text>
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === step ? styles.dotOn : null]} />
          ))}
        </View>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("revealCoach.skip")}
            onPress={() => void finish()}
            hitSlop={8}
          >
            <Text style={styles.skip}>{t("revealCoach.skip")}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isLast ? t("revealCoach.done") : t("revealCoach.next")}
            style={[styles.next, { backgroundColor: colors.brand }]}
            onPress={() => void next()}
          >
            <Text style={styles.nextText}>{isLast ? t("revealCoach.done") : t("revealCoach.next")}</Text>
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}

function buildStyles(colors: ThemeColors) {
  return StyleSheet.create({
    mask: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "flex-end",
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      backgroundColor: "transparent",
      zIndex: 80,
    },
    card: {
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      padding: spacing.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.brand,
    },
    kicker: {
      fontSize: typography.micro,
      fontWeight: "700",
      color: colors.brandText,
      marginBottom: spacing.xs,
      textTransform: "uppercase",
    },
    title: { fontSize: typography.h4, fontWeight: "900", color: colors.textPrimary },
    body: {
      marginTop: spacing.sm,
      fontSize: typography.body,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    dots: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.md },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
    dotOn: { backgroundColor: colors.brand, width: 16 },
    actions: {
      marginTop: spacing.lg,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    skip: { color: colors.textMuted, fontWeight: "600" },
    next: {
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    nextText: { color: colors.textOnBrand, fontWeight: "800" },
  });
}

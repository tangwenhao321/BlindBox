import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../context/ThemeContext";
import { useOnboardingAnchors, type OnboardingAnchorKey } from "../context/OnboardingAnchorContext";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";
import { markOnboardingCoachDone } from "../utils/onboardingCoachStorage";

const STORAGE_KEY = "onboarding_done_v1";
const COACH_KEYS: OnboardingAnchorKey[] = ["openBox", "payArea", "warehouseTab"];

const FALLBACK_HOLES: Record<OnboardingAnchorKey, object> = {
  openBox: { top: "58%", height: 56, left: 24, right: 24 },
  payArea: { top: "68%", height: 72, left: 24, right: 24 },
  warehouseTab: { bottom: 88, height: 56, left: 24, right: 24 },
};

type Props = {
  visible: boolean;
  mode?: "intro" | "coach";
  initialStep?: number;
  onStepChange?: (step: number) => void;
  onDone: () => void;
};

export function OnboardingFlow({ visible, mode = "intro", initialStep = 0, onStepChange, onDone }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildOnboardingFlowStyles);
  const coachStyles = useThemedStyles(buildCoachStyles);
  const [step, setStep] = useState(0);
  const { anchors } = useOnboardingAnchors();

  const introSteps = useMemo(
    () => [t("onboarding.step1"), t("onboarding.step2"), t("onboarding.step3")],
    [t],
  );

  const coachSteps = useMemo(
    () => [
      { key: COACH_KEYS[0], title: t("onboardingCoach.step1Title"), body: t("onboardingCoach.step1Body") },
      { key: COACH_KEYS[1], title: t("onboardingCoach.step2Title"), body: t("onboardingCoach.step2Body") },
      { key: COACH_KEYS[2], title: t("onboardingCoach.step3Title"), body: t("onboardingCoach.step3Body") },
    ],
    [t],
  );

  const steps = mode === "coach" ? coachSteps : introSteps;
  const isLast = step >= steps.length - 1;

  useEffect(() => {
    if (visible) setStep(Math.max(0, Math.min(initialStep, steps.length - 1)));
  }, [visible, mode, initialStep, steps.length]);

  useEffect(() => {
    if (visible) onStepChange?.(step);
  }, [visible, step, onStepChange]);

  const finish = async () => {
    if (mode === "coach") {
      await markOnboardingCoachDone();
    } else {
      await markOnboardingDone();
    }
    setStep(0);
    onDone();
  };

  const next = async () => {
    if (isLast) {
      await finish();
      return;
    }
    setStep((s) => s + 1);
  };

  if (!visible) return null;

  if (mode === "coach") {
    const current = coachSteps[step];
    const rect = anchors[current.key];
    const holeStyle = rect
      ? {
          position: "absolute" as const,
          top: rect.y - 6,
          left: rect.x - 6,
          width: rect.width + 12,
          height: rect.height + 12,
          borderWidth: 2,
          borderColor: colors.brand,
          borderRadius: radius.lg,
        }
      : [coachStyles.hole, FALLBACK_HOLES[current.key]];

    return (
      <Modal visible transparent animationType="fade" onRequestClose={finish}>
        <View style={coachStyles.mask}>
          <View style={holeStyle} />
          <View style={coachStyles.card}>
            <Text style={coachStyles.title}>{current.title}</Text>
            <Text style={coachStyles.body}>{current.body}</Text>
            <View style={coachStyles.dots}>
              {coachSteps.map((_, i) => (
                <View key={i} style={[coachStyles.dot, i === step ? coachStyles.dotOn : null]} />
              ))}
            </View>
            <View style={coachStyles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("onboarding.skip")}
                onPress={finish}
              >
                <Text style={coachStyles.skip}>{t("onboarding.skip")}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isLast ? t("onboarding.done") : t("onboarding.next")}
                style={coachStyles.next}
                onPress={next}
              >
                <Text style={coachStyles.nextText}>{isLast ? t("onboarding.done") : t("onboarding.next")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal transparent animationType="fade" visible onRequestClose={finish}>
      <View style={styles.mask}>
        <View style={styles.card}>
          <Text style={styles.title}>{t("onboarding.title")}</Text>
          <Text style={styles.body}>{introSteps[step]}</Text>
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" accessibilityLabel={t("onboarding.skip")} onPress={finish}>
              <Text style={styles.skip}>{t("onboarding.skip")}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isLast ? t("onboarding.done") : t("onboarding.next")}
              style={styles.next}
              onPress={next}
            >
              <Text style={styles.nextText}>{isLast ? t("onboarding.done") : t("onboarding.next")}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export async function shouldShowOnboarding() {
  const value = await AsyncStorage.getItem(STORAGE_KEY);
  return value !== "1";
}

export async function markOnboardingDone() {
  await AsyncStorage.setItem(STORAGE_KEY, "1");
}

function buildOnboardingFlowStyles(colors: ThemeColors) {
  return StyleSheet.create({
    mask: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", padding: spacing.lg },
    card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.lg },
    title: { fontSize: typography.h3, fontWeight: "900", marginBottom: spacing.md, color: colors.textPrimary },
    body: { fontSize: typography.body, color: colors.textPrimary, lineHeight: 22 },
    actions: { marginTop: spacing.lg, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    skip: { color: colors.textMuted },
    next: {
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    nextText: { color: colors.textOnBrand, fontWeight: "800" },
  });
}

function buildCoachStyles(colors: ThemeColors) {
  return StyleSheet.create({
    mask: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)" },
    hole: { position: "absolute", borderWidth: 2, borderColor: colors.brand, borderRadius: radius.lg },
    card: {
      position: "absolute",
      left: spacing.lg,
      right: spacing.lg,
      bottom: spacing.xxl,
      backgroundColor: colors.bgCard,
      borderRadius: radius.lg,
      padding: spacing.lg,
    },
    title: { fontSize: typography.h4, fontWeight: "900", color: colors.textPrimary },
    body: { marginTop: spacing.sm, fontSize: typography.body, color: colors.textSecondary, lineHeight: 22 },
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
      backgroundColor: colors.brand,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    nextText: { color: colors.textOnBrand, fontWeight: "800" },
  });
}

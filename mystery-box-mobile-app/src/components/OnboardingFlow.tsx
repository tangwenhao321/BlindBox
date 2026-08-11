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
import { PlaceholderCover } from "./ui/PlaceholderCover";

const STORAGE_KEY = "onboarding_done_v1";

const FALLBACK_HOLES: Record<OnboardingAnchorKey, object> = {
  openBox: { top: "58%", height: 56, left: 24, right: 24 },
  payArea: { top: "68%", height: 72, left: 24, right: 24 },
  warehouseTab: { bottom: 88, height: 56, left: 24, right: 24 },
  profileTab: { bottom: 88, height: 56, left: "72%", right: 24 },
};

type IntroBeat = {
  titleKey: string;
  bodyKey: string;
  accent: "cabinet" | "pay" | "warehouse";
};

const INTRO_BEATS: IntroBeat[] = [
  { titleKey: "onboarding.step1Title", bodyKey: "onboarding.step1", accent: "cabinet" },
  { titleKey: "onboarding.step2Title", bodyKey: "onboarding.step2", accent: "pay" },
  { titleKey: "onboarding.step3Title", bodyKey: "onboarding.step3", accent: "warehouse" },
];

type Props = {
  visible: boolean;
  mode?: "intro" | "coach";
  initialStep?: number;
  onStepChange?: (step: number) => void;
  onDone: () => void;
};

function BeatVisual({ accent }: { accent: IntroBeat["accent"] }) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildBeatVisualStyles);

  return (
    <View style={styles.wrap}>
      <PlaceholderCover style={styles.cover} />
      <View style={styles.overlay}>
        {accent === "cabinet" ? (
          <View style={styles.cabinetRow}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.cabinetCell,
                  { backgroundColor: i === 1 ? colors.brand : colors.bgCard, opacity: i === 1 ? 1 : 0.72 },
                ]}
              />
            ))}
          </View>
        ) : null}
        {accent === "pay" ? (
          <View style={[styles.payCard, { backgroundColor: colors.bgCard, borderColor: colors.brand }]}>
            <View style={[styles.payBar, { backgroundColor: colors.brand }]} />
            <View style={[styles.payLine, { backgroundColor: colors.borderSoft }]} />
            <View style={[styles.payLineShort, { backgroundColor: colors.borderSoft }]} />
          </View>
        ) : null}
        {accent === "warehouse" ? (
          <View style={styles.warehouseStack}>
            <View style={[styles.crate, { backgroundColor: colors.bgCard, borderColor: colors.brandDark }]} />
            <View style={[styles.crate, styles.crateFront, { backgroundColor: colors.brand, borderColor: colors.brandDark }]} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Intro + anchor coach (open / pay / warehouse / profile).
 * First-reveal tips (skip + settlement share) live in RevealCoachTips
 * via AsyncStorage flag `reveal_coach_seen` — not mixed into this coach mask.
 */
export function OnboardingFlow({ visible, mode = "intro", initialStep = 0, onStepChange, onDone }: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildOnboardingFlowStyles);
  const coachStyles = useThemedStyles(buildCoachStyles);
  const [step, setStep] = useState(0);
  const { anchors } = useOnboardingAnchors();

  const coachSteps = useMemo(
    () =>
      [
        { key: "openBox" as const, title: t("onboardingCoach.step1Title"), body: t("onboardingCoach.step1Body") },
        { key: "payArea" as const, title: t("onboardingCoach.step2Title"), body: t("onboardingCoach.step2Body") },
        { key: "warehouseTab" as const, title: t("onboardingCoach.step3Title"), body: t("onboardingCoach.step3Body") },
        { key: "profileTab" as const, title: t("onboardingCoach.step4Title"), body: t("onboardingCoach.step4Body") },
      ] satisfies { key: OnboardingAnchorKey; title: string; body: string }[],
    [t],
  );

  const stepsLen = mode === "coach" ? coachSteps.length : INTRO_BEATS.length;
  const isLast = step >= stepsLen - 1;

  useEffect(() => {
    if (visible) setStep(Math.max(0, Math.min(initialStep, stepsLen - 1)));
  }, [visible, mode, initialStep, stepsLen]);

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

  const beat = INTRO_BEATS[step];

  return (
    <Modal transparent animationType="fade" visible onRequestClose={finish}>
      <View style={styles.mask}>
        <View style={styles.card}>
          <BeatVisual accent={beat.accent} />
          <Text style={styles.title}>{t(beat.titleKey)}</Text>
          <Text style={styles.body}>{t(beat.bodyKey)}</Text>
          <View style={styles.dots}>
            {INTRO_BEATS.map((_, i) => (
              <View key={i} style={[styles.dot, i === step ? styles.dotOn : null]} />
            ))}
          </View>
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

function buildBeatVisualStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      height: 132,
      borderRadius: radius.lg,
      overflow: "hidden",
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cover: { ...StyleSheet.absoluteFillObject },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
    },
    cabinetRow: { flexDirection: "row", gap: 10 },
    cabinetCell: {
      width: 42,
      height: 52,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.25)",
    },
    payCard: {
      width: 148,
      borderRadius: 12,
      padding: 12,
      gap: 8,
      borderWidth: 1.5,
    },
    payBar: { height: 10, borderRadius: 5, width: "55%" },
    payLine: { height: 6, borderRadius: 3, width: "100%" },
    payLineShort: { height: 6, borderRadius: 3, width: "70%" },
    warehouseStack: { width: 120, height: 72, alignItems: "center", justifyContent: "flex-end" },
    crate: {
      width: 88,
      height: 36,
      borderRadius: 8,
      borderWidth: 1.5,
      position: "absolute",
      bottom: 22,
    },
    crateFront: { bottom: 4, width: 104, height: 40 },
  });
}

function buildOnboardingFlowStyles(colors: ThemeColors) {
  return StyleSheet.create({
    mask: { flex: 1, backgroundColor: colors.overlay, justifyContent: "center", padding: spacing.lg },
    card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.lg },
    title: { fontSize: typography.h3, fontWeight: "900", marginBottom: spacing.sm, color: colors.textPrimary },
    body: { fontSize: typography.body, color: colors.textSecondary, lineHeight: 22 },
    dots: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.md },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
    dotOn: { backgroundColor: colors.brand, width: 16 },
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
    mask: { flex: 1, backgroundColor: colors.overlay },
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

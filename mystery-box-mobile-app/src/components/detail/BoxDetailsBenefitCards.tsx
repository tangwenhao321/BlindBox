import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { font, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
import type { MysteryBoxInsight } from "../../services/boxInsightService";
import type { PityProgress } from "../../services/pityService";
import { needsPityCompensate } from "../../utils/pityCompensate";
import { pityCopyI18nKey, pityPercentOf } from "../../utils/pityCopy";
import { PityCompensateSheet } from "./PityCompensateSheet";

type Props = {
  pityProgress: PityProgress | null;
  insight: MysteryBoxInsight | null;
  token?: string;
  boxId?: string;
  onPityRefetch?: () => void | Promise<void>;
};

export function BoxDetailsBenefitCards({ pityProgress, insight, token, boxId, onPityRefetch }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildBenefitStyles);
  const showDesignated = !!insight?.designatedBenefitRemaining && insight.designatedBenefitRemaining > 0;
  const compensateNeeded = needsPityCompensate(pityProgress?.compensateStatus);
  const [sheetVisible, setSheetVisible] = useState(false);

  useEffect(() => {
    if (pityProgress?.compensateStatus?.toUpperCase() === "PENDING" && token && boxId) {
      setSheetVisible(true);
    }
  }, [pityProgress?.compensateStatus, token, boxId]);

  if (!pityProgress && !showDesignated) return null;

  return (
    <>
      {pityProgress ? (
        <View style={styles.pityCard}>
          <Text style={styles.pityTitle}>{t("boxDetails.pityTitle")}</Text>
          <Text style={styles.pityHint}>
            {t(pityCopyI18nKey(pityProgress), {
              current: pityProgress.current,
              threshold: pityProgress.threshold,
              remaining: pityProgress.remaining,
            })}
          </Text>
          <View style={styles.pityTrack}>
            <View style={[styles.pityFill, { width: `${pityPercentOf(pityProgress)}%` }]} />
          </View>
        </View>
      ) : null}

      {compensateNeeded && token && boxId ? (
        <View style={styles.compensateBanner} accessibilityRole="summary">
          <Text style={styles.compensateTitle}>{t("boxDetails.pityCompensateTitle")}</Text>
          <Text style={styles.compensateBody}>{t("boxDetails.pityCompensateBody")}</Text>
          <Pressable
            style={({ pressed }) => [styles.compensateCta, pressed ? styles.pressed : null]}
            onPress={() => setSheetVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={t("boxDetails.pityCompensateChoose")}
          >
            <Text style={styles.compensateCtaText}>{t("boxDetails.pityCompensateChoose")}</Text>
          </Pressable>
        </View>
      ) : null}

      {token && boxId ? (
        <PityCompensateSheet
          visible={sheetVisible}
          token={token}
          boxId={boxId}
          onClose={() => setSheetVisible(false)}
          onCompleted={onPityRefetch}
        />
      ) : null}

      {showDesignated ? (
        <View style={styles.designatedCard}>
          <Text style={styles.designatedTitle}>{t("boxDetails.designatedTitle")}</Text>
          <Text style={styles.designatedHint}>
            {insight?.designatedBenefitHint ||
              t("boxDetails.designatedHintDefault", { count: insight?.designatedBenefitRemaining })}
          </Text>
        </View>
      ) : null}
    </>
  );
}

function buildBenefitStyles(colors: ThemeColors) {
  return StyleSheet.create({
    pityCard: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xs,
      marginBottom: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    pityTitle: {
      ...font("bodySemiBold"),
      color: colors.brandText,
      marginBottom: spacing.xs,
      fontSize: typography.caption,
    },
    pityHint: {
      ...font("body"),
      fontSize: typography.caption,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    pityTrack: {
      marginTop: spacing.sm,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: colors.tierTrack,
      overflow: "hidden",
    },
    pityFill: { height: "100%", backgroundColor: colors.brand, borderRadius: 1.5 },
    compensateBanner: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      marginBottom: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.warningSoftBorder,
      backgroundColor: colors.warningSoft,
      gap: spacing.xs,
    },
    compensateTitle: {
      ...font("bodySemiBold"),
      color: colors.textPrimary,
      fontSize: typography.caption,
    },
    compensateBody: {
      ...font("body"),
      fontSize: typography.caption,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    compensateCta: {
      marginTop: spacing.sm,
      alignSelf: "flex-start",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.brand,
      paddingVertical: spacing.xs,
    },
    compensateCtaText: {
      ...font("bodySemiBold"),
      color: colors.brandText,
      fontSize: typography.caption,
    },
    pressed: { opacity: 0.88 },
    designatedCard: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xs,
      marginBottom: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    designatedTitle: {
      ...font("bodySemiBold"),
      color: colors.textPrimary,
      marginBottom: spacing.xs,
      fontSize: typography.caption,
    },
    designatedHint: {
      ...font("body"),
      fontSize: typography.caption,
      color: colors.textSecondary,
      lineHeight: 18,
    },
  });
}

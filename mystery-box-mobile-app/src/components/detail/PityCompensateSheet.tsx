import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";
import { applyPityCompensateChoice } from "../../utils/pityCompensate";
import { trackEvent } from "../../utils/analytics";
import { ANALYTICS_EVENTS } from "../../utils/analyticsEvents";
import { isIosDigitalGoodsRestricted } from "../../utils/iosDigitalGoodsGate";
import { toast } from "../../utils/toast";

type Props = {
  visible: boolean;
  token: string;
  boxId: string;
  onClose: () => void;
  onCompleted?: () => void | Promise<void>;
};

export function PityCompensateSheet({ visible, token, boxId, onClose, onCompleted }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(buildPityCompensateStyles);
  const [submitting, setSubmitting] = useState<"WAIT" | "POINTS" | null>(null);
  const pointsAllowed = !isIosDigitalGoodsRestricted();

  const submit = async (choice: "WAIT" | "POINTS") => {
    if (submitting) return;
    if (choice === "POINTS" && !pointsAllowed) {
      toast.info(t("api.errors.iosDigitalGoodsBlocked"));
      return;
    }
    setSubmitting(choice);
    try {
      const ok = await applyPityCompensateChoice(token, boxId, choice);
      if (ok) {
        trackEvent(ANALYTICS_EVENTS.PITY_COMPENSATE, { boxId, choice });
        await onCompleted?.();
        onClose();
      }
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={styles.mask}
        onPress={submitting ? undefined : onClose}
        accessibilityLabel={t("common.cancel")}
      >
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()} accessibilityViewIsModal>
          <Text style={styles.title}>{t("boxDetails.pityCompensateTitle")}</Text>
          <Text style={styles.message}>
            {pointsAllowed
              ? t("boxDetails.pityCompensateBody")
              : t("boxDetails.pityCompensateBodyIos")}
          </Text>
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.btn,
                styles.waitBtn,
                pressed || submitting ? styles.pressed : null,
              ]}
              disabled={!!submitting}
              onPress={() => void submit("WAIT")}
              accessibilityRole="button"
              accessibilityLabel={t("boxDetails.pityCompensateWait")}
            >
              {submitting === "WAIT" ? (
                <ActivityIndicator color={styles.waitText.color} />
              ) : (
                <Text style={styles.waitText}>{t("boxDetails.pityCompensateWait")}</Text>
              )}
            </Pressable>
            {pointsAllowed ? (
              <Pressable
                style={({ pressed }) => [
                  styles.btn,
                  styles.pointsBtn,
                  pressed || submitting ? styles.pressed : null,
                ]}
                disabled={!!submitting}
                onPress={() => void submit("POINTS")}
                accessibilityRole="button"
                accessibilityLabel={t("boxDetails.pityCompensatePoints")}
              >
                {submitting === "POINTS" ? (
                  <ActivityIndicator color={styles.pointsText.color} />
                ) : (
                  <Text style={styles.pointsText}>{t("boxDetails.pityCompensatePoints")}</Text>
                )}
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function buildPityCompensateStyles(colors: ThemeColors) {
  return StyleSheet.create({
    mask: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.bgCard,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      padding: spacing.xl,
      paddingBottom: spacing.xxl,
      gap: spacing.md,
    },
    title: { fontSize: typography.h4, fontWeight: "800", color: colors.textPrimary },
    message: { fontSize: typography.body, color: colors.textSecondary, lineHeight: 22 },
    actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
    btn: {
      flex: 1,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 48,
    },
    waitBtn: { backgroundColor: colors.bgSoft, borderWidth: 1, borderColor: colors.border },
    pointsBtn: { backgroundColor: colors.brand },
    waitText: { color: colors.textPrimary, fontWeight: "700" },
    pointsText: { color: colors.textOnBrand, fontWeight: "800" },
    pressed: { opacity: 0.88 },
  });
}

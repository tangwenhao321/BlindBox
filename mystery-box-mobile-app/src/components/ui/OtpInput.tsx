import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../context/ThemeContext";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { useOtpResend } from "../../hooks/useOtpResend";
import { radius, spacing, typography } from "../../styles/tokens";
import type { ThemeColors } from "../../styles/themes";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSendCode: () => void | Promise<void>;
  disabled?: boolean;
  length?: number;
  testID?: string;
};

export function OtpInput({
  value,
  onChange,
  onSendCode,
  disabled = false,
  length = 6,
  testID = "otpInput",
}: Props) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildOtpInputStyles);
  const { secondsLeft, canResend, startCooldown } = useOtpResend();

  const handleSend = () => {
    if (!canResend || disabled) return;
    void Promise.resolve(onSendCode()).then(() => startCooldown());
  };

  return (
    <View style={styles.root}>
      <Text style={styles.label}>{t("login.codeLabel")}</Text>
      <View style={styles.row}>
        <TextInput
          testID={testID}
          accessibilityLabel={t("login.codeLabel")}
          value={value}
          onChangeText={(text) => onChange(text.replace(/\D/g, "").slice(0, length))}
          style={styles.input}
          keyboardType="number-pad"
          maxLength={length}
          placeholder={t("login.codePlaceholder")}
          placeholderTextColor={colors.textMuted}
          editable={!disabled}
        />
        <Pressable
          style={[styles.resendBtn, !canResend || disabled ? styles.resendBtnDisabled : null]}
          onPress={handleSend}
          disabled={!canResend || disabled}
          accessibilityRole="button"
          accessibilityLabel={
            canResend ? t("login.resendCodeA11y") : t("login.resendCodeWaitA11y", { seconds: secondsLeft })
          }
        >
          <Text style={styles.resendText}>
            {canResend ? t("login.getCode") : t("login.resendIn", { seconds: secondsLeft })}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function buildOtpInputStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { marginTop: spacing.sm },
    label: {
      fontSize: typography.caption,
      fontWeight: "700",
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    row: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: typography.body,
      color: colors.textPrimary,
      backgroundColor: colors.bgCard,
    },
    resendBtn: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
      backgroundColor: colors.bgBrandSoft,
      minWidth: 96,
      alignItems: "center",
    },
    resendBtnDisabled: { opacity: 0.55 },
    resendText: { color: colors.brand, fontWeight: "700", fontSize: typography.caption },
  });
}

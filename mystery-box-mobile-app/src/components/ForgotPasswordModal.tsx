import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { useScreenStyles } from "../styles/screenStyles";
import { OtpInput } from "./ui/OtpInput";
import { radius, spacing, typography } from "../styles/tokens";
import type { ThemeColors } from "../styles/themes";

type Props = {
  visible: boolean;
  phone: string;
  code: string;
  password: string;
  submitting: boolean;
  onPhoneChange: (v: string) => void;
  onCodeChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  onSendCode: () => void | Promise<unknown>;
};

export function ForgotPasswordModal(props: Props) {
  const {
    visible,
    phone,
    code,
    password,
    submitting,
    onPhoneChange,
    onCodeChange,
    onPasswordChange,
    onClose,
    onSubmit,
    onSendCode,
  } = props;
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useThemedStyles(buildForgotPasswordStyles);
  const screenStyles = useScreenStyles();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.mask}>
        <View style={styles.card}>
          <Text style={styles.title}>{t("login.resetTitle")}</Text>
          <Text style={styles.hint}>{t("login.resetHint")}</Text>
          <TextInput
            value={phone}
            onChangeText={onPhoneChange}
            style={screenStyles.input}
            keyboardType="phone-pad"
            placeholder={t("login.phonePlaceholder")}
            placeholderTextColor={colors.textMuted}
            editable={!submitting}
            accessibilityLabel={t("login.phoneLabel")}
          />
          <OtpInput
            value={code}
            onChange={onCodeChange}
            onSendCode={onSendCode}
            disabled={submitting}
            testID="forgotOtpInput"
          />
          <TextInput
            value={password}
            onChangeText={onPasswordChange}
            style={screenStyles.input}
            secureTextEntry
            placeholder={t("login.newPasswordPlaceholder")}
            placeholderTextColor={colors.textMuted}
            editable={!submitting}
            accessibilityLabel={t("login.passwordLabel")}
          />
          <View style={styles.actions}>
            <Pressable
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel={t("common.cancel")}
            >
              <Text style={styles.cancelText}>{t("common.cancel")}</Text>
            </Pressable>
            <Pressable
              style={styles.submitBtn}
              onPress={onSubmit}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel={t("login.confirmReset")}
            >
              {submitting ? (
                <ActivityIndicator color={colors.textOnBrand} />
              ) : (
                <Text style={styles.submitText}>{t("login.confirmReset")}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function buildForgotPasswordStyles(colors: ThemeColors) {
  return StyleSheet.create({
    mask: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: spacing.lg },
    card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.lg },
    title: { fontSize: typography.h4, fontWeight: "800", marginBottom: spacing.xs, color: colors.textPrimary },
    hint: { fontSize: typography.caption, color: colors.textMuted, marginBottom: spacing.md },
    actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
    cancelBtn: {
      flex: 1,
      padding: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
    },
    cancelText: { color: colors.textMuted, fontWeight: "600" },
    submitBtn: {
      flex: 1,
      padding: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.brand,
      alignItems: "center",
    },
    submitText: { color: colors.textOnBrand, fontWeight: "700" },
  });
}

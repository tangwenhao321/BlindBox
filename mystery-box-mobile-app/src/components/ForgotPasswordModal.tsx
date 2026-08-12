import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../context/ThemeContext";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { useScreenStyles } from "../styles/screenStyles";
import { OtpInput } from "./ui/OtpInput";
import { PasswordStrengthBar } from "./ui/PasswordStrengthBar";
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
  onSendCode: () => void | boolean | Promise<void | boolean | { ok: boolean }>;
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
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        style={styles.mask}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
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
          <View style={styles.passwordRow}>
            <TextInput
              value={password}
              onChangeText={onPasswordChange}
              style={[screenStyles.input, styles.passwordInput]}
              secureTextEntry={!showPassword}
              textContentType="newPassword"
              autoComplete="password-new"
              placeholder={t("login.newPasswordPlaceholder")}
              placeholderTextColor={colors.textMuted}
              editable={!submitting}
              accessibilityLabel={t("login.passwordLabel")}
            />
            <Pressable
              style={styles.eyeBtn}
              onPress={() => setShowPassword((v) => !v)}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? t("login.hidePassword") : t("login.showPassword")}
            >
              <Text style={styles.eyeText}>
                {showPassword ? t("login.hidePassword") : t("login.showPassword")}
              </Text>
            </Pressable>
          </View>
          <PasswordStrengthBar password={password} />
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
      </KeyboardAvoidingView>
    </Modal>
  );
}

function buildForgotPasswordStyles(colors: ThemeColors) {
  return StyleSheet.create({
    mask: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: spacing.lg },
    card: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: spacing.lg },
    title: { fontSize: typography.h4, fontWeight: "800", marginBottom: spacing.xs, color: colors.textPrimary },
    hint: { fontSize: typography.caption, color: colors.textMuted, marginBottom: spacing.md },
    passwordRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
    passwordInput: { flex: 1, marginBottom: 0 },
    eyeBtn: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm },
    eyeText: { color: colors.link, fontWeight: "600", fontSize: typography.caption },
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

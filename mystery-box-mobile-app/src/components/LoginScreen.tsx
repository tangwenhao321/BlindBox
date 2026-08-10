import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useScreenStyles } from "../styles/screenStyles";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { useAppTheme } from "../context/ThemeContext";
import { layout, radius, shadows, spacing, typography } from "../styles/tokens";
import { OtpInput } from "./ui/OtpInput";
import type { ThemeColors } from "../styles/themes";
import { getBiometricUnlockEnabled } from "../utils/biometricUnlock";
import { hasStoredAuthToken } from "../hooks/useAuth";

const HERO_IMAGE = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80";

type Props = {
  apiBaseUrl: string;
  phone: string;
  password: string;
  confirmPassword?: string;
  submitting: boolean;
  onPhoneChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange?: (value: string) => void;
  inviteCode?: string;
  onInviteCodeChange?: (value: string) => void;
  authError?: string | null;
  onLogin: () => void | Promise<void>;
  onRegister: () => void | Promise<void>;
  smsCode?: string;
  onSmsCodeChange?: (value: string) => void;
  onSendSmsCode?: () => void | Promise<void>;
  onForgotPassword?: () => void;
  onClose?: () => void;
  onClearAuthError?: () => void;
  biometricUnlockAvailable?: boolean;
  onBiometricUnlock?: () => void | Promise<void>;
};

export function LoginScreen(props: Props) {
  const {
    apiBaseUrl,
    phone,
    password,
    submitting,
    onPhoneChange,
    onPasswordChange,
    confirmPassword = "",
    onConfirmPasswordChange,
    inviteCode = "",
    onInviteCodeChange,
    authError,
    onLogin,
    onRegister,
    smsCode = "",
    onSmsCodeChange,
    onSendSmsCode,
    onForgotPassword,
    onClose,
    onClearAuthError,
    biometricUnlockAvailable = false,
    onBiometricUnlock,
  } = props;
  const { t } = useTranslation();
  const { colors: themeColors } = useAppTheme();
  const styles = useThemedStyles(buildLoginStyles);
  const screenStyles = useScreenStyles();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [showBiometricUnlock, setShowBiometricUnlock] = useState(false);
  const usesLocalhost = /127\.0\.0\.1|localhost/i.test(apiBaseUrl) && Platform.OS !== "web";

  useEffect(() => {
    if (mode !== "login" || !biometricUnlockAvailable || !onBiometricUnlock) {
      setShowBiometricUnlock(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const [enabled, stored] = await Promise.all([getBiometricUnlockEnabled(), hasStoredAuthToken()]);
      if (!cancelled) setShowBiometricUnlock(enabled && stored);
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, biometricUnlockAvailable, onBiometricUnlock]);

  return (
    <SafeAreaView style={styles.page} edges={["top", "left", "right"]}>
      <StatusBar style="light" backgroundColor={themeColors.brandDark} translucent={false} />
      {onClose ? (
        <Pressable style={styles.closeBtn} onPress={onClose} accessibilityLabel={t("login.close")}>
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      ) : null}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
          <ImageBackground source={{ uri: HERO_IMAGE }} style={styles.heroBg} resizeMode="cover">
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <Text style={styles.brandMark}>{t("login.brandMark")}</Text>
              <Text style={styles.heroTitle}>{t("login.heroTitle")}</Text>
              <Text style={styles.heroSub}>{t("login.heroSub")}</Text>
            </View>
          </ImageBackground>

          <View style={styles.formSheet}>
            <View style={styles.modeTabs}>
              <Pressable
                style={[styles.modeTab, mode === "login" ? styles.modeTabActive : null]}
                onPress={() => {
                  onClearAuthError?.();
                  setMode("login");
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === "login" }}
                accessibilityLabel={t("login.tabLogin")}
              >
                <Text style={[styles.modeTabText, mode === "login" ? styles.modeTabTextActive : null]}>
                  {t("login.tabLogin")}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modeTab, mode === "register" ? styles.modeTabActive : null]}
                onPress={() => {
                  onClearAuthError?.();
                  setMode("register");
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: mode === "register" }}
                accessibilityLabel={t("login.tabRegister")}
              >
                <Text style={[styles.modeTabText, mode === "register" ? styles.modeTabTextActive : null]}>
                  {t("login.tabRegister")}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.syncHint}>{t("auth.loginSyncHint")}</Text>

            {__DEV__ ? <Text style={styles.endpoint}>{t("login.endpoint", { url: apiBaseUrl })}</Text> : null}
            {__DEV__ ? (
              <Text style={styles.endpointHint}>
                {t("login.devAccountHint", { phone: "13800138000", password: "Admin@123456", code: "000000" })}
              </Text>
            ) : null}
            {__DEV__ && usesLocalhost ? (
              <Text style={styles.endpointWarn}>{t("login.localhostWarn")}</Text>
            ) : null}

            <Text style={styles.fieldLabel}>{t("login.phoneLabel")}</Text>
            <TextInput
              testID="loginPhoneInput"
              accessibilityLabel={t("login.phoneLabel")}
              value={phone}
              onChangeText={onPhoneChange}
              style={screenStyles.input}
              keyboardType="phone-pad"
              placeholder={t("login.phonePlaceholder")}
              placeholderTextColor={themeColors.textPlaceholder}
              editable={!submitting}
            />

            <Text style={styles.fieldLabel}>{t("login.passwordLabel")}</Text>
            <View style={styles.passwordRow}>
              <TextInput
                testID="loginPasswordInput"
                accessibilityLabel={t("login.passwordLabel")}
                value={password}
                onChangeText={onPasswordChange}
                style={[screenStyles.input, styles.passwordInput, { marginBottom: 0 }]}
                secureTextEntry={!showPassword}
                placeholder={t("login.passwordPlaceholder")}
                placeholderTextColor={themeColors.textPlaceholder}
                editable={!submitting}
              />
              <Pressable
                style={styles.eyeBtn}
                onPress={() => setShowPassword((v) => !v)}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? t("login.hidePassword") : t("login.showPassword")}
              >
                <Text style={styles.eyeText}>{showPassword ? t("login.hidePassword") : t("login.showPassword")}</Text>
              </Pressable>
            </View>

            {mode === "register" && onConfirmPasswordChange ? (
              <>
                <Text style={styles.fieldLabel}>{t("login.confirmPasswordLabel")}</Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={onConfirmPasswordChange}
                  style={screenStyles.input}
                  secureTextEntry
                  placeholder={t("login.confirmPasswordPlaceholder")}
                  placeholderTextColor={themeColors.textPlaceholder}
                  editable={!submitting}
                />
              </>
            ) : null}

            {mode === "register" && onInviteCodeChange ? (
              <>
                <Text style={styles.fieldLabel}>{t("login.inviteCodeLabel")}</Text>
                <TextInput
                  value={inviteCode}
                  onChangeText={onInviteCodeChange}
                  style={screenStyles.input}
                  placeholder={t("login.inviteCodePlaceholder")}
                  placeholderTextColor={themeColors.textPlaceholder}
                  autoCapitalize="characters"
                  editable={!submitting}
                />
              </>
            ) : null}

            {mode === "register" && onSmsCodeChange && onSendSmsCode ? (
              <OtpInput
                value={smsCode}
                onChange={onSmsCodeChange}
                onSendCode={onSendSmsCode}
                disabled={submitting}
                testID="registerOtpInput"
              />
            ) : null}

            {mode === "login" && onForgotPassword ? (
              <Pressable
                onPress={onForgotPassword}
                disabled={submitting}
                style={styles.forgotWrap}
                accessibilityRole="button"
                accessibilityLabel={t("login.forgotPassword")}
              >
                <Text style={styles.forgotText}>{t("login.forgotPassword")}</Text>
              </Pressable>
            ) : null}

            {authError ? (
              <View style={styles.errorBanner} accessibilityRole="alert">
                <Text style={styles.errorBannerText}>{authError}</Text>
              </View>
            ) : null}

            {mode === "login" && showBiometricUnlock && onBiometricUnlock ? (
              <Pressable
                style={({ pressed }) => [styles.biometricBtn, pressed ? screenStyles.pressed : null]}
                onPress={() => void onBiometricUnlock()}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel={t("login.biometricUnlock")}
              >
                <Text style={styles.biometricText}>{t("login.biometricUnlock")}</Text>
              </Pressable>
            ) : null}

            <Pressable
              testID="loginSubmitButton"
              accessibilityLabel={mode === "login" ? t("login.submitLogin") : t("login.submitRegister")}
              style={({ pressed }) => [
                styles.button,
                submitting ? styles.buttonDisabled : null,
                pressed ? screenStyles.pressed : null,
              ]}
              onPress={() => {
                void (mode === "login" ? onLogin() : onRegister());
              }}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={themeColors.textOnBrand} />
              ) : (
                <Text style={styles.primaryText}>
                  {mode === "login" ? t("login.submitLogin") : t("login.submitRegister")}
                </Text>
              )}
            </Pressable>

            {mode === "login" ? (
              <Pressable
                onPress={() => setMode("register")}
                disabled={submitting}
                style={styles.switchModeWrap}
                accessibilityRole="button"
                accessibilityLabel={t("login.switchToRegister")}
              >
                <Text style={styles.switchModeText}>
                  {t("login.switchToRegister")}
                  <Text style={styles.switchModeLink}>{t("login.switchToRegisterLink")}</Text>
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => setMode("login")}
                disabled={submitting}
                style={styles.switchModeWrap}
                accessibilityRole="button"
                accessibilityLabel={t("login.switchToLogin")}
              >
                <Text style={styles.switchModeText}>
                  {t("login.switchToLogin")}
                  <Text style={styles.switchModeLink}>{t("login.switchToLoginLink")}</Text>
                </Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function buildLoginStyles(colors: ThemeColors) {
  return StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bgPage },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  closeBtn: {
    position: "absolute",
    top: spacing.lg,
    right: spacing.lg,
    zIndex: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: { color: colors.textOnBrand, fontSize: 24, lineHeight: 24, fontWeight: "300" },
  heroBg: { height: 200, width: "100%" },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.heroOverlay },
  heroContent: { flex: 1, justifyContent: "flex-end", padding: spacing.xl, paddingBottom: spacing.xxl },
  brandMark: {
    color: "rgba(255,255,255,0.75)",
    fontSize: typography.micro,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  heroTitle: { fontSize: typography.h1, fontWeight: "800", color: colors.textOnBrand, letterSpacing: -1 },
  heroSub: { marginTop: spacing.sm, color: "rgba(255,255,255,0.9)", fontSize: typography.body, lineHeight: 22 },
  formSheet: {
    flex: 1,
    marginTop: -radius.xl,
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: colors.border,
    ...shadows.card,
    minHeight: 420,
  },
  modeTabs: {
    flexDirection: "row",
    backgroundColor: colors.bgSoft,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing.lg,
  },
  modeTab: { flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: radius.pill },
  modeTabActive: { backgroundColor: colors.bgCard, ...shadows.cardSm },
  modeTabText: { fontWeight: "700", color: colors.textMuted, fontSize: typography.body },
  modeTabTextActive: { color: colors.brand, fontWeight: "900" },
  syncHint: {
    color: colors.textMuted,
    fontSize: typography.caption,
    lineHeight: 20,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  endpoint: { color: colors.textMuted, marginBottom: spacing.md, fontSize: typography.micro },
  endpointHint: { color: colors.textSecondary, marginBottom: spacing.md, fontSize: typography.micro, lineHeight: 18 },
  endpointWarn: { color: colors.danger, marginBottom: spacing.md, fontSize: typography.micro, lineHeight: 18 },
  errorBanner: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warningSoftBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  errorBannerText: { color: colors.warning, fontSize: typography.caption, fontWeight: "700", lineHeight: 20 },
  fieldLabel: {
    fontSize: typography.caption,
    fontWeight: "700",
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  passwordRow: { position: "relative", marginBottom: spacing.sm },
  passwordInput: { paddingRight: 72 },
  eyeBtn: { position: "absolute", right: spacing.lg, top: 14 },
  eyeText: { color: colors.brand, fontWeight: "800", fontSize: typography.caption },
  forgotWrap: { alignSelf: "flex-end", marginBottom: spacing.md, marginTop: spacing.xs },
  forgotText: { color: colors.brand, fontWeight: "800", fontSize: typography.caption },
  button: {
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: layout.buttonMinHeight,
    ...shadows.cardSm,
    width: "100%",
    marginTop: spacing.lg,
  },
  primaryText: { color: colors.textOnBrand, fontWeight: "800", fontSize: typography.body },
  buttonDisabled: { opacity: 0.6 },
  biometricBtn: {
    marginTop: spacing.md,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.brand,
  },
  biometricText: { color: colors.brand, fontWeight: "800", fontSize: typography.body },
  switchModeWrap: { alignItems: "center", marginTop: spacing.lg, paddingVertical: spacing.sm },
  switchModeText: { color: colors.textMuted, fontSize: typography.caption },
  switchModeLink: { color: colors.brand, fontWeight: "800" },
  });
}

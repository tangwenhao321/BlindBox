import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInput as TextInputType,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useScreenStyles } from "../styles/screenStyles";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { useAppTheme } from "../context/ThemeContext";
import { layout, radius, shadows, spacing, typography, font, withAlpha } from "../styles/tokens";
import { OtpInput } from "./ui/OtpInput";
import { PasswordStrengthBar } from "./ui/PasswordStrengthBar";
import { AgreementCheckbox } from "./ui/AgreementCheckbox";
import type { ThemeColors } from "../styles/themes";
import { getBiometricUnlockEnabled } from "../utils/biometricUnlock";
import { hasStoredAuthToken } from "../hooks/useAuth";
import { useAppPublicConfig } from "../hooks/useAppPublicConfig";
import { startZaloAuthSession } from "../utils/zaloOAuth";
import type { ZaloLoginPayload } from "../services/authService";
import { AppGradient } from "./ui/AppGradient";
import { PlaceholderCover } from "./ui/PlaceholderCover";
import { toast } from "../utils/toast";
import { getAppLocale } from "../utils/i18nLocale";
import { normalizePhoneInput } from "../utils/loginValidation";
import { resolveLegalLink } from "../utils/legalLinks";
import { router } from "expo-router";

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
  onSmsLogin?: () => void | Promise<void>;
  onRegister: () => void | Promise<void>;
  onZaloLogin?: (payload: ZaloLoginPayload) => void | Promise<void>;
  smsCode?: string;
  onSmsCodeChange?: (value: string) => void;
  onSendSmsCode?: () => void | boolean | Promise<void | boolean | { ok: boolean }>;
  loginSmsCode?: string;
  onLoginSmsCodeChange?: (value: string) => void;
  onSendLoginSmsCode?: () => void | boolean | Promise<void | boolean | { ok: boolean }>;
  termsAccepted?: boolean;
  onTermsToggle?: () => void;
  onForgotPassword?: () => void;
  onClose?: () => void;
  onClearAuthError?: () => void;
  biometricUnlockAvailable?: boolean;
  onBiometricUnlock?: () => void | Promise<void>;
};

function openEnvLegalLink(url: string | undefined, view: "termsOfService" | "privacy") {
  const target = resolveLegalLink(url, view);
  if (target.kind === "external") {
    void Linking.openURL(target.url);
    return;
  }
  router.push(target.href as never);
}

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
    onSmsLogin,
    onRegister,
    onZaloLogin,
    smsCode = "",
    onSmsCodeChange,
    onSendSmsCode,
    loginSmsCode = "",
    onLoginSmsCodeChange,
    onSendLoginSmsCode,
    termsAccepted = false,
    onTermsToggle,
    onForgotPassword,
    onClose,
    onClearAuthError,
    biometricUnlockAvailable = false,
    onBiometricUnlock,
  } = props;
  const { t } = useTranslation();
  const { colors: themeColors, isDark } = useAppTheme();
  const styles = useThemedStyles(buildLoginStyles);
  const screenStyles = useScreenStyles();
  const { zaloLoginEnabled } = useAppPublicConfig();
  const showZaloButton = Platform.OS !== "ios" && zaloLoginEnabled === true && typeof onZaloLogin === "function";
  /** Coming-soon teaser only while the feature flag is off (enabled → real button). */
  const showZaloComingSoon = Platform.OS !== "ios" && zaloLoginEnabled !== true;
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginMethod, setLoginMethod] = useState<"password" | "sms">("password");
  const [showPassword, setShowPassword] = useState(false);
  const [showBiometricUnlock, setShowBiometricUnlock] = useState(false);
  const [zaloBusy, setZaloBusy] = useState(false);
  const [zaloPasteVerifier, setZaloPasteVerifier] = useState<string | null>(null);
  const [zaloPasteCode, setZaloPasteCode] = useState("");
  const passwordRef = useRef<TextInputType>(null);
  const usesLocalhost = /127\.0\.0\.1|localhost/i.test(apiBaseUrl) && Platform.OS !== "web";
  const phonePlaceholder =
    getAppLocale() === "vi-VN" ? t("login.phonePlaceholderVn") : t("login.phonePlaceholder");
  const phoneOk = normalizePhoneInput(phone).length > 0;
  const showPasswordLogin = mode === "login" && loginMethod === "password";
  const showSmsLogin = mode === "login" && loginMethod === "sms";
  const showPasswordFields = mode === "register" || showPasswordLogin;

  const canSubmitPrimary = (() => {
    if (mode === "register") {
      return (
        phoneOk &&
        password.trim().length >= 8 &&
        confirmPassword === password &&
        smsCode.trim().length === 6 &&
        termsAccepted &&
        !submitting
      );
    }
    if (loginMethod === "sms") {
      return phoneOk && loginSmsCode.trim().length === 6 && !submitting;
    }
    return phoneOk && password.trim().length >= 6 && !submitting && !zaloBusy;
  })();

  const handlePrimarySubmit = () => {
    if (!canSubmitPrimary) return;
    if (mode === "register") {
      void onRegister();
      return;
    }
    if (loginMethod === "sms") {
      void onSmsLogin?.();
      return;
    }
    void onLogin();
  };

  const handleZaloPress = async () => {
    if (!onZaloLogin || zaloBusy || submitting) return;
    onClearAuthError?.();
    setZaloBusy(true);
    try {
      const session = await startZaloAuthSession();
      if (session.status === "success") {
        setZaloPasteVerifier(null);
        await onZaloLogin({
          code: session.code,
          codeVerifier: session.codeVerifier,
          inviteCode: inviteCode?.trim() || undefined,
        });
        return;
      }
      if (session.status === "paste_required") {
        setZaloPasteVerifier(session.codeVerifier);
        setZaloPasteCode("");
        return;
      }
      if (session.status === "cancelled") return;
      if (session.status === "error") {
        toast.error(
          session.message === "missing_app_id" ? t("login.zaloConfigMissing") : session.message || t("login.zaloFailed"),
        );
      }
    } finally {
      setZaloBusy(false);
    }
  };

  const handleZaloPasteSubmit = async () => {
    if (!onZaloLogin || !zaloPasteVerifier || !zaloPasteCode.trim()) return;
    onClearAuthError?.();
    setZaloBusy(true);
    try {
      await onZaloLogin({
        code: zaloPasteCode.trim(),
        codeVerifier: zaloPasteVerifier,
        inviteCode: inviteCode?.trim() || undefined,
      });
      setZaloPasteVerifier(null);
      setZaloPasteCode("");
    } finally {
      setZaloBusy(false);
    }
  };

  useEffect(() => {
    if (mode !== "login" || loginMethod !== "password" || !biometricUnlockAvailable || !onBiometricUnlock) {
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
  }, [mode, loginMethod, biometricUnlockAvailable, onBiometricUnlock]);

  return (
    <SafeAreaView style={styles.page} edges={["top", "left", "right"]}>
      <StatusBar style={isDark ? "light" : "dark"} translucent backgroundColor="transparent" />
      {onClose ? (
        <Pressable style={styles.closeBtn} onPress={onClose} accessibilityLabel={t("login.close")}>
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      ) : null}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
          <View style={styles.heroBg}>
            <PlaceholderCover style={StyleSheet.absoluteFill} />
            <AppGradient
              colors={[
                withAlpha(themeColors.bgPage, 0.15),
                withAlpha(themeColors.bgPage, 0.55),
                themeColors.bgPage,
              ]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroContent}>
              <Text style={styles.brandMark} accessibilityRole="header">
                {t("login.brandMark")}
              </Text>
              <Text style={styles.heroTitle}>{t("login.heroTitle")}</Text>
              <Text style={styles.heroSub}>{t("login.heroSub")}</Text>
            </View>
          </View>

          <View style={styles.formSheet}>
            <View style={styles.modeTabs} accessibilityRole="tablist">
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

            {mode === "login" ? (
              <View style={styles.methodTabs} accessibilityRole="tablist">
                <Pressable
                  style={[styles.methodTab, loginMethod === "password" ? styles.methodTabActive : null]}
                  onPress={() => {
                    onClearAuthError?.();
                    setLoginMethod("password");
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: loginMethod === "password" }}
                  accessibilityLabel={t("login.methodPassword")}
                >
                  <Text
                    style={[styles.methodTabText, loginMethod === "password" ? styles.methodTabTextActive : null]}
                  >
                    {t("login.methodPassword")}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.methodTab, loginMethod === "sms" ? styles.methodTabActive : null]}
                  onPress={() => {
                    onClearAuthError?.();
                    setLoginMethod("sms");
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: loginMethod === "sms" }}
                  accessibilityLabel={t("login.methodSms")}
                >
                  <Text style={[styles.methodTabText, loginMethod === "sms" ? styles.methodTabTextActive : null]}>
                    {t("login.methodSms")}
                  </Text>
                </Pressable>
              </View>
            ) : null}

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
              onBlur={() => {
                const normalized = normalizePhoneInput(phone);
                if (normalized !== phone) onPhoneChange(normalized);
              }}
              style={screenStyles.input}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              returnKeyType="next"
              onSubmitEditing={() => {
                if (showPasswordFields) passwordRef.current?.focus();
              }}
              placeholder={phonePlaceholder}
              placeholderTextColor={themeColors.textPlaceholder}
              editable={!submitting}
            />

            {showPasswordFields ? (
              <>
                <Text style={styles.fieldLabel}>{t("login.passwordLabel")}</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    ref={passwordRef}
                    testID="loginPasswordInput"
                    accessibilityLabel={t("login.passwordLabel")}
                    value={password}
                    onChangeText={onPasswordChange}
                    style={[screenStyles.input, styles.passwordInput, { marginBottom: 0 }]}
                    secureTextEntry={!showPassword}
                    textContentType={mode === "login" ? "password" : "newPassword"}
                    autoComplete={mode === "login" ? "password" : "password-new"}
                    returnKeyType="go"
                    onSubmitEditing={handlePrimarySubmit}
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
              </>
            ) : null}

            {mode === "register" && onConfirmPasswordChange ? (
              <>
                <Text style={styles.fieldLabel}>{t("login.confirmPasswordLabel")}</Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={onConfirmPasswordChange}
                  style={screenStyles.input}
                  secureTextEntry
                  textContentType="newPassword"
                  autoComplete="password-new"
                  placeholder={t("login.confirmPasswordPlaceholder")}
                  placeholderTextColor={themeColors.textPlaceholder}
                  editable={!submitting}
                />
                <PasswordStrengthBar password={password} />
              </>
            ) : null}

            {(mode === "register" || showZaloButton) && onInviteCodeChange ? (
              <>
                <Text style={styles.fieldLabel}>{t("login.inviteCodeLabel")}</Text>
                <TextInput
                  value={inviteCode}
                  onChangeText={onInviteCodeChange}
                  style={screenStyles.input}
                  placeholder={t("login.inviteCodePlaceholder")}
                  placeholderTextColor={themeColors.textPlaceholder}
                  autoCapitalize="characters"
                  editable={!submitting && !zaloBusy}
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

            {mode === "register" && onTermsToggle ? (
              <>
                <AgreementCheckbox checked={termsAccepted} onToggle={onTermsToggle}>
                  {t("login.agreeTerms")}
                </AgreementCheckbox>
                <View style={styles.legalLinks}>
                  <Pressable
                    onPress={() => openEnvLegalLink(process.env.EXPO_PUBLIC_TERMS_URL, "termsOfService")}
                    accessibilityRole="link"
                    accessibilityLabel={t("login.openTerms")}
                  >
                    <Text style={styles.legalLinkText}>{t("login.openTerms")}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => openEnvLegalLink(process.env.EXPO_PUBLIC_PRIVACY_URL, "privacy")}
                    accessibilityRole="link"
                    accessibilityLabel={t("login.openPrivacy")}
                  >
                    <Text style={styles.legalLinkText}>{t("login.openPrivacy")}</Text>
                  </Pressable>
                </View>
              </>
            ) : null}

            {showSmsLogin && onLoginSmsCodeChange && onSendLoginSmsCode ? (
              <OtpInput
                value={loginSmsCode}
                onChange={onLoginSmsCodeChange}
                onSendCode={onSendLoginSmsCode}
                disabled={submitting}
                testID="loginOtpInput"
              />
            ) : null}

            {showPasswordLogin && onForgotPassword ? (
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

            {showPasswordLogin && showBiometricUnlock && onBiometricUnlock ? (
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

            {showPasswordLogin && showZaloButton ? (
              <View style={styles.zaloBlock}>
                <Pressable
                  testID="zaloLoginButton"
                  style={({ pressed }) => [
                    styles.zaloBtn,
                    submitting || zaloBusy ? styles.buttonDisabled : null,
                    pressed ? screenStyles.pressed : null,
                  ]}
                  onPress={() => void handleZaloPress()}
                  disabled={submitting || zaloBusy}
                  accessibilityRole="button"
                  accessibilityLabel={t("login.zaloLogin")}
                >
                  {zaloBusy ? (
                    <ActivityIndicator color={themeColors.brand} />
                  ) : (
                    <Text style={styles.zaloBtnText}>{t("login.zaloLogin")}</Text>
                  )}
                </Pressable>
                {zaloPasteVerifier ? (
                  <>
                    <Text style={styles.zaloPasteHint}>{t("login.zaloPasteHint")}</Text>
                    <TextInput
                      testID="zaloPasteCodeInput"
                      accessibilityLabel={t("login.zaloPastePlaceholder")}
                      value={zaloPasteCode}
                      onChangeText={setZaloPasteCode}
                      style={screenStyles.input}
                      placeholder={t("login.zaloPastePlaceholder")}
                      placeholderTextColor={themeColors.textPlaceholder}
                      autoCapitalize="none"
                      editable={!submitting && !zaloBusy}
                    />
                    <Pressable
                      testID="zaloPasteSubmitButton"
                      style={({ pressed }) => [styles.zaloPasteSubmit, pressed ? screenStyles.pressed : null]}
                      onPress={() => void handleZaloPasteSubmit()}
                      disabled={submitting || zaloBusy || !zaloPasteCode.trim()}
                      accessibilityRole="button"
                      accessibilityLabel={t("login.zaloPasteSubmit")}
                    >
                      <Text style={styles.zaloPasteSubmitText}>{t("login.zaloPasteSubmit")}</Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
            ) : showPasswordLogin && showZaloComingSoon ? (
              <View style={styles.zaloComingSoon} accessibilityRole="text">
                <Text style={styles.zaloComingSoonText}>{t("login.zaloComingSoon")}</Text>
              </View>
            ) : null}

            <Pressable
              testID="loginSubmitButton"
              accessibilityLabel={mode === "login" ? t("login.submitLogin") : t("login.submitRegister")}
              style={({ pressed }) => [
                styles.button,
                !canSubmitPrimary ? styles.buttonDisabled : null,
                pressed ? screenStyles.pressed : null,
              ]}
              onPress={handlePrimarySubmit}
              disabled={!canSubmitPrimary}
            >
              <AppGradient
                colors={[themeColors.brandDark, themeColors.brandGradientEnd]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.buttonFill}
              >
                {submitting ? (
                  <ActivityIndicator color={themeColors.textOnBrand} />
                ) : (
                  <Text style={styles.primaryText}>
                    {mode === "login" ? t("login.submitLogin") : t("login.submitRegister")}
                  </Text>
                )}
              </AppGradient>
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
      top: spacing.md,
      right: spacing.lg,
      zIndex: 20,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: withAlpha(colors.bgPage, 0.45),
      borderWidth: 1,
      borderColor: colors.profileHeroGlassBorder,
      alignItems: "center",
      justifyContent: "center",
    },
    closeText: { color: colors.textPrimary, fontSize: 24, lineHeight: 24, fontWeight: "300" },
    heroBg: {
      minHeight: 300,
      width: "100%",
      overflow: "hidden",
      backgroundColor: colors.bgPage,
    },
    heroContent: {
      flex: 1,
      justifyContent: "flex-end",
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xxl * 2,
      paddingBottom: spacing.xxl + spacing.md,
    },
    brandMark: {
      ...font("display"),
      color: colors.brandText,
      fontSize: typography.display,
      letterSpacing: 1.2,
      marginBottom: spacing.sm,
      lineHeight: 40,
    },
    heroTitle: {
      ...font("bodySemiBold"),
      fontSize: typography.h3,
      color: colors.textPrimary,
      letterSpacing: 0.2,
      lineHeight: 28,
    },
    heroSub: {
      marginTop: spacing.sm,
      color: colors.textSubtitleSoft,
      fontSize: typography.body,
      lineHeight: 22,
    },
    formSheet: {
      flex: 1,
      marginTop: -radius.lg,
      backgroundColor: colors.bgCard,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xl,
      paddingBottom: spacing.xxl,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.profileHeroGlassBorder,
      ...shadows.card,
      minHeight: 420,
    },
    modeTabs: {
      flexDirection: "row",
      backgroundColor: colors.bgSoft,
      borderRadius: radius.md,
      padding: 3,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modeTab: {
      flex: 1,
      alignItems: "center",
      paddingVertical: spacing.sm + 2,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: "transparent",
    },
    modeTabActive: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.chipBorder,
    },
    modeTabText: { fontWeight: "600", color: colors.textMuted, fontSize: typography.body },
    modeTabTextActive: { color: colors.brandText, fontWeight: "800" },
    methodTabs: {
      flexDirection: "row",
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    methodTab: {
      flex: 1,
      alignItems: "center",
      paddingVertical: spacing.sm,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.bgSoft,
    },
    methodTabActive: {
      borderColor: colors.chipBorder,
      backgroundColor: colors.accentSoft,
    },
    methodTabText: { fontWeight: "600", color: colors.textMuted, fontSize: typography.caption },
    methodTabTextActive: { color: colors.brandText, fontWeight: "800" },
    syncHint: {
      color: colors.textMuted,
      fontSize: typography.caption,
      lineHeight: 20,
      marginBottom: spacing.md,
      textAlign: "center",
    },
    endpoint: { color: colors.textMuted, marginBottom: spacing.md, fontSize: typography.micro },
    endpointHint: {
      color: colors.textSecondary,
      marginBottom: spacing.md,
      fontSize: typography.micro,
      lineHeight: 18,
    },
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
    legalLinks: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.md,
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
    legalLinkText: {
      color: colors.brand,
      fontSize: typography.micro,
      fontWeight: "700",
      textDecorationLine: "underline",
    },
    button: {
      borderRadius: radius.md,
      overflow: "hidden",
      width: "100%",
      marginTop: spacing.lg,
      minHeight: layout.buttonMinHeight,
      ...shadows.cardSm,
    },
    buttonFill: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      alignItems: "center",
      justifyContent: "center",
      minHeight: layout.buttonMinHeight,
    },
    primaryText: { color: colors.textOnBrand, fontWeight: "800", fontSize: typography.body },
    buttonDisabled: { opacity: 0.6 },
    biometricBtn: {
      marginTop: spacing.md,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.chipBorder,
      backgroundColor: colors.accentSoft,
    },
    biometricText: { color: colors.brandText, fontWeight: "800", fontSize: typography.body },
    zaloBlock: { marginTop: spacing.md, width: "100%", gap: spacing.sm },
    zaloBtn: {
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.chipBorder,
      minHeight: layout.buttonMinHeight,
      justifyContent: "center",
      backgroundColor: colors.bgSoft,
    },
    zaloBtnText: { color: colors.brandText, fontWeight: "800", fontSize: typography.body },
    zaloPasteHint: {
      color: colors.textSecondary,
      fontSize: typography.caption,
      fontWeight: "600",
    },
    zaloPasteSubmit: {
      alignItems: "center",
      paddingVertical: spacing.sm,
    },
    zaloPasteSubmitText: { color: colors.brand, fontWeight: "800", fontSize: typography.caption },
    zaloComingSoon: {
      marginTop: spacing.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.bgMuted,
      alignItems: "center",
    },
    zaloComingSoonText: {
      color: colors.textSecondary,
      fontSize: typography.caption,
      fontWeight: "600",
    },
    switchModeWrap: { alignItems: "center", marginTop: spacing.lg, paddingVertical: spacing.sm },
    switchModeText: { color: colors.textMuted, fontSize: typography.caption },
    switchModeLink: { color: colors.brand, fontWeight: "800" },
  });
}

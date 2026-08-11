import { useCallback, useState } from "react";
import { parseError } from "../api";
import i18n from "../i18n";
import { resetPassword } from "../services/authService";
import type { ZaloLoginPayload } from "../services/authService";
import { resolveSmsCode } from "../utils/devMockOtp";
import { toast } from "../utils/toast";
import { normalizePhoneInput, validatePassword, validatePhone } from "../utils/loginValidation";
import { trackEvent } from "../utils/analytics";

type AuthApi = {
  phone: string;
  password: string;
  setPhone: (v: string) => void;
  setPassword: (v: string) => void;
  login: () => Promise<string>;
  loginWithSms: (smsCode: string) => Promise<string>;
  loginWithZalo: (payload: ZaloLoginPayload) => Promise<string>;
  register: (inviteCode?: string, smsCode?: string) => Promise<string>;
};

type Params = {
  auth: AuthApi;
  confirmPassword: string;
  inviteCode: string;
  clearInviteCode?: () => void;
  setLoginVisible: (v: boolean) => void;
  onAuthSuccess: (token: string) => Promise<void>;
  newcomerClearSession: () => Promise<void>;
};

async function finishAuthSuccess(
  nextToken: string,
  onAuthSuccess: (token: string) => Promise<void>,
  successKey: string,
) {
  try {
    await onAuthSuccess(nextToken);
    toast.success(i18n.t(successKey));
  } catch (error) {
    toast.error(parseError(error));
  }
}

export function useAppAuthHandlers({
  auth,
  confirmPassword,
  inviteCode,
  clearInviteCode,
  setLoginVisible,
  onAuthSuccess,
  newcomerClearSession,
}: Params) {
  const { phone, password, setPhone, setPassword, login, loginWithSms, loginWithZalo, register } = auth;
  const [authError, setAuthError] = useState<string | null>(null);
  const [forgotVisible, setForgotVisible] = useState(false);
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [registerCode, setRegisterCode] = useState("");
  const [loginSmsCode, setLoginSmsCode] = useState("");
  const [forgotPassword, setForgotPassword] = useState("");
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const onRegister = useCallback(async () => {
    const phoneError = validatePhone(phone);
    const passwordError = validatePassword(password);
    if (phoneError || passwordError) {
      setAuthError(phoneError || passwordError || i18n.t("auth.checkInput"));
      return;
    }
    if (password !== confirmPassword) {
      setAuthError(i18n.t("auth.passwordMismatch"));
      return;
    }
    if (!/^\d{6}$/.test(registerCode.trim()) && !resolveSmsCode(registerCode)) {
      setAuthError(i18n.t("auth.codeRequired"));
      return;
    }
    if (!termsAccepted) {
      setAuthError(i18n.t("auth.termsRequired"));
      return;
    }
    setAuthError(null);
    try {
      const nextToken = await register(inviteCode.trim() || undefined, registerCode);
      await newcomerClearSession();
      setLoginVisible(false);
      trackEvent("register_success", { inviteCodeUsed: Boolean(inviteCode.trim()) });
      if (inviteCode.trim()) {
        trackEvent("invite_code_used", { codeLength: inviteCode.trim().length });
        clearInviteCode?.();
      }
      await finishAuthSuccess(nextToken, onAuthSuccess, "auth.registerSuccess");
    } catch (error) {
      setAuthError(parseError(error));
    }
  }, [
    clearInviteCode,
    confirmPassword,
    inviteCode,
    newcomerClearSession,
    onAuthSuccess,
    password,
    phone,
    register,
    registerCode,
    setLoginVisible,
    termsAccepted,
  ]);

  const onLogin = useCallback(async () => {
    const phoneError = validatePhone(phone);
    const passwordError = validatePassword(password, "login");
    if (phoneError || passwordError) {
      setAuthError(phoneError || passwordError || i18n.t("auth.checkInput"));
      return;
    }
    setAuthError(null);
    try {
      const nextToken = await login();
      setLoginVisible(false);
      trackEvent("login_success", { method: "password" });
      await finishAuthSuccess(nextToken, onAuthSuccess, "auth.loginSuccess");
    } catch (error) {
      setAuthError(parseError(error));
    }
  }, [login, onAuthSuccess, password, phone, setLoginVisible]);

  const onSmsLogin = useCallback(async () => {
    const phoneError = validatePhone(phone);
    if (phoneError) {
      setAuthError(phoneError);
      return;
    }
    if (!/^\d{6}$/.test(loginSmsCode.trim()) && !resolveSmsCode(loginSmsCode)) {
      setAuthError(i18n.t("auth.codeRequired"));
      return;
    }
    setAuthError(null);
    try {
      const nextToken = await loginWithSms(loginSmsCode);
      setLoginVisible(false);
      trackEvent("login_success", { method: "sms" });
      await finishAuthSuccess(nextToken, onAuthSuccess, "auth.loginSuccess");
    } catch (error) {
      setAuthError(parseError(error));
    }
  }, [loginSmsCode, loginWithSms, onAuthSuccess, phone, setLoginVisible]);

  const onZaloLogin = useCallback(
    async (payload: ZaloLoginPayload) => {
      setAuthError(null);
      try {
        const withInvite: ZaloLoginPayload = {
          ...payload,
          inviteCode: payload.inviteCode?.trim() || inviteCode.trim() || undefined,
        };
        const nextToken = await loginWithZalo(withInvite);
        setLoginVisible(false);
        trackEvent("login_success", { method: "zalo" });
        if (withInvite.inviteCode) {
          trackEvent("invite_code_used", {
            codeLength: withInvite.inviteCode.length,
            channel: "zalo",
          });
        }
        await finishAuthSuccess(nextToken, onAuthSuccess, "auth.loginSuccess");
      } catch (error) {
        setAuthError(parseError(error));
      }
    },
    [inviteCode, loginWithZalo, onAuthSuccess, setLoginVisible],
  );

  const onForgotSubmit = useCallback(async () => {
    const phoneError = validatePhone(forgotPhone);
    const passwordError = validatePassword(forgotPassword);
    if (phoneError || passwordError) {
      toast.error(phoneError || passwordError || i18n.t("auth.checkInput"));
      return;
    }
    setForgotSubmitting(true);
    try {
      const normalized = normalizePhoneInput(forgotPhone);
      await resetPassword(normalized, forgotPassword, resolveSmsCode(forgotCode));
      toast.success(i18n.t("auth.resetSuccess"));
      setForgotVisible(false);
      setPhone(normalized);
      setPassword(forgotPassword);
      setAuthError(null);
    } catch (error) {
      toast.error(parseError(error));
    } finally {
      setForgotSubmitting(false);
    }
  }, [forgotCode, forgotPassword, forgotPhone, setPassword, setPhone]);

  return {
    authError,
    clearAuthError,
    forgotVisible,
    setForgotVisible,
    forgotPhone,
    setForgotPhone,
    forgotCode,
    setForgotCode,
    registerCode,
    setRegisterCode,
    loginSmsCode,
    setLoginSmsCode,
    forgotPassword,
    setForgotPassword,
    forgotSubmitting,
    termsAccepted,
    setTermsAccepted,
    onLogin,
    onSmsLogin,
    onZaloLogin,
    onRegister,
    onForgotSubmit,
  };
}

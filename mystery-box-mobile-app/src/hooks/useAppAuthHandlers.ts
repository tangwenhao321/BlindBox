import { useCallback, useState } from "react";

import { parseError } from "../api";
import i18n from "../i18n";

import { resetPassword } from "../services/authService";
import { resolveSmsCode } from "../utils/devMockOtp";

import { toast } from "../utils/toast";

import { validatePassword, validatePhone } from "../utils/loginValidation";

import { trackEvent } from "../utils/analytics";



type AuthApi = {

  phone: string;

  password: string;

  setPhone: (v: string) => void;

  setPassword: (v: string) => void;

  login: () => Promise<string>;

  register: (inviteCode?: string, smsCode?: string) => Promise<string>;

};



type Params = {

  auth: AuthApi;

  confirmPassword: string;

  inviteCode: string;

  setLoginVisible: (v: boolean) => void;

  onAuthSuccess: (token: string) => Promise<void>;

  newcomerClearSession: () => Promise<void>;

};



export function useAppAuthHandlers({

  auth,

  confirmPassword,

  inviteCode,

  setLoginVisible,

  onAuthSuccess,

  newcomerClearSession,

}: Params) {

  const { phone, password, setPhone, setPassword, login, register } = auth;

  const [authError, setAuthError] = useState<string | null>(null);

  const [forgotVisible, setForgotVisible] = useState(false);

  const [forgotPhone, setForgotPhone] = useState("");

  const [forgotCode, setForgotCode] = useState("");
  const [registerCode, setRegisterCode] = useState("");

  const [forgotPassword, setForgotPassword] = useState("");

  const [forgotSubmitting, setForgotSubmitting] = useState(false);



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

    setAuthError(null);

    try {

      const nextToken = await register(inviteCode.trim() || undefined, registerCode);

      await newcomerClearSession();

      setLoginVisible(false);

      try {

        await onAuthSuccess(nextToken);

        trackEvent("register_success", {
          inviteCodeUsed: Boolean(inviteCode.trim()),
        });
        if (inviteCode.trim()) {
          trackEvent("invite_code_used", { codeLength: inviteCode.trim().length });
        }

        toast.success(i18n.t("auth.registerSuccess"));

      } catch (error) {

        toast.error(parseError(error));

      }

    } catch (error) {

      setAuthError(parseError(error));

    }

  }, [

    confirmPassword,

    inviteCode,

    newcomerClearSession,

    onAuthSuccess,

    password,

    phone,

    register,
    registerCode,

    setLoginVisible,

  ]);



  const onLogin = useCallback(async () => {

    const phoneError = validatePhone(phone);

    const passwordError = validatePassword(password);

    if (phoneError || passwordError) {

      setAuthError(phoneError || passwordError || i18n.t("auth.checkInput"));

      return;

    }

    setAuthError(null);

    try {

      const nextToken = await login();

      setLoginVisible(false);

      try {

        await onAuthSuccess(nextToken);

        trackEvent("login_success");

        toast.success(i18n.t("auth.loginSuccess"));

      } catch (error) {

        toast.error(parseError(error));

      }

    } catch (error) {

      setAuthError(parseError(error));

    }

  }, [login, onAuthSuccess, password, phone, setLoginVisible]);



  const onForgotSubmit = useCallback(async () => {

    const phoneError = validatePhone(forgotPhone);

    const passwordError = validatePassword(forgotPassword);

    if (phoneError || passwordError) {

      toast.error(phoneError || passwordError || i18n.t("auth.checkInput"));

      return;

    }

    setForgotSubmitting(true);

    try {

      await resetPassword(forgotPhone, forgotPassword, resolveSmsCode(forgotCode));

      toast.success(i18n.t("auth.resetSuccess"));

      setForgotVisible(false);

      setPhone(forgotPhone);

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

    forgotPassword,

    setForgotPassword,

    forgotSubmitting,

    onLogin,

    onRegister,

    onForgotSubmit,

  };

}


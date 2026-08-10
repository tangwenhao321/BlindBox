import type { ComponentProps } from "react";
import type { LoginGate } from "../shell/LoginGate";
import { sendAuthSmsCode } from "../utils/sendAuthSmsCode";
import { authenticateBiometricUnlock } from "../utils/biometricUnlock";
import i18n from "../i18n";
import { toast } from "../utils/toast";

type AuthHandlers = {
  authError: string | null;
  clearAuthError: () => void;
  forgotVisible: boolean;
  forgotPhone: string;
  forgotCode: string;
  forgotPassword: string;
  forgotSubmitting: boolean;
  setForgotPhone: (v: string) => void;
  setForgotVisible: (v: boolean) => void;
  setForgotCode: (v: string) => void;
  setRegisterCode: (v: string) => void;
  registerCode: string;
  setForgotPassword: (v: string) => void;
  onLogin: () => void | Promise<void>;
  onRegister: () => void | Promise<void>;
  onForgotSubmit: () => void | Promise<void>;
};

export type LoginGateBuildInput = {
  apiBaseUrl: string;
  loginVisible: boolean;
  setLoginVisible: (visible: boolean) => void;
  phone: string;
  password: string;
  confirmPassword: string;
  inviteCode: string;
  submitting: boolean;
  setPhone: (v: string) => void;
  setPassword: (v: string) => void;
  setConfirmPassword: (v: string) => void;
  setInviteCode: (v: string) => void;
  authHandlers: AuthHandlers;
  restoreToken: () => Promise<string | null>;
};

export function buildAppLoginGateProps(input: LoginGateBuildInput): ComponentProps<typeof LoginGate> {
  const {
    apiBaseUrl,
    loginVisible,
    setLoginVisible,
    phone,
    password,
    confirmPassword,
    inviteCode,
    submitting,
    setPhone,
    setPassword,
    setConfirmPassword,
    setInviteCode,
    authHandlers,
    restoreToken,
  } = input;

  return {
    visible: loginVisible,
    apiBaseUrl,
    phone,
    password,
    confirmPassword,
    inviteCode,
    submitting,
    forgotVisible: authHandlers.forgotVisible,
    forgotPhone: authHandlers.forgotPhone,
    forgotCode: authHandlers.forgotCode,
    forgotPassword: authHandlers.forgotPassword,
    forgotSubmitting: authHandlers.forgotSubmitting,
    registerCode: authHandlers.registerCode,
    authError: authHandlers.authError,
    onPhoneChange: (value) => {
      authHandlers.clearAuthError();
      setPhone(value);
    },
    onPasswordChange: (value) => {
      authHandlers.clearAuthError();
      setPassword(value);
    },
    onConfirmPasswordChange: (value) => {
      authHandlers.clearAuthError();
      setConfirmPassword(value);
    },
    onInviteCodeChange: (value) => {
      authHandlers.clearAuthError();
      setInviteCode(value);
    },
    onClose: () => setLoginVisible(false),
    onLogin: authHandlers.onLogin,
    onRegister: authHandlers.onRegister,
    onForgotOpen: () => {
      authHandlers.setForgotPhone(phone);
      authHandlers.setForgotVisible(true);
    },
    onForgotPhoneChange: authHandlers.setForgotPhone,
    onForgotCodeChange: authHandlers.setForgotCode,
    onRegisterCodeChange: authHandlers.setRegisterCode,
    onForgotPasswordChange: authHandlers.setForgotPassword,
    onForgotClose: () => authHandlers.setForgotVisible(false),
    onForgotSendCode: () => sendAuthSmsCode(authHandlers.forgotPhone),
    onRegisterSendCode: () => sendAuthSmsCode(phone),
    onForgotSubmit: authHandlers.onForgotSubmit,
    onClearAuthError: authHandlers.clearAuthError,
    biometricUnlockAvailable: true,
    onBiometricUnlock: async () => {
      const ok = await authenticateBiometricUnlock(i18n.t("login.biometricPrompt"));
      if (!ok) {
        toast.info(i18n.t("login.biometricFailed"));
        return;
      }
      const saved = await restoreToken();
      if (saved) {
        setLoginVisible(false);
        toast.success(i18n.t("login.biometricSuccess"));
      } else {
        toast.info(i18n.t("login.biometricNoSession"));
      }
    },
  };
}

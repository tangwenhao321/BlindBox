import { Modal } from "react-native";
import { LoginScreen } from "../components/LoginScreen";
import { ForgotPasswordModal } from "../components/ForgotPasswordModal";

type Props = {
  visible: boolean;
  apiBaseUrl: string;
  phone: string;
  password: string;
  confirmPassword: string;
  inviteCode: string;
  submitting: boolean;
  forgotVisible: boolean;
  forgotPhone: string;
  forgotCode: string;
  forgotPassword: string;
  forgotSubmitting: boolean;
  registerCode: string;
  authError?: string | null;
  onPhoneChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onConfirmPasswordChange: (v: string) => void;
  onInviteCodeChange: (v: string) => void;
  onClose: () => void;
  onLogin: () => void;
  onRegister: () => void;
  onForgotOpen: () => void;
  onForgotPhoneChange: (v: string) => void;
  onForgotCodeChange: (v: string) => void;
  onRegisterCodeChange: (v: string) => void;
  onForgotPasswordChange: (v: string) => void;
  onForgotClose: () => void;
  onForgotSendCode: () => void | Promise<void>;
  onRegisterSendCode: () => void | Promise<void>;
  onForgotSubmit: () => void;
  onClearAuthError?: () => void;
  biometricUnlockAvailable?: boolean;
  onBiometricUnlock?: () => void | Promise<void>;
};

export function LoginGate(props: Props) {
  if (!props.visible) return null;
  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={props.onClose}>
      <LoginScreen
        apiBaseUrl={props.apiBaseUrl}
        phone={props.phone}
        password={props.password}
        confirmPassword={props.confirmPassword}
        submitting={props.submitting}
        authError={props.authError}
        onPhoneChange={props.onPhoneChange}
        onPasswordChange={props.onPasswordChange}
        inviteCode={props.inviteCode}
        onInviteCodeChange={props.onInviteCodeChange}
        onConfirmPasswordChange={props.onConfirmPasswordChange}
        onLogin={props.onLogin}
        onRegister={props.onRegister}
        smsCode={props.registerCode}
        onSmsCodeChange={props.onRegisterCodeChange}
        onSendSmsCode={props.onRegisterSendCode}
        onClose={props.onClose}
        onForgotPassword={props.onForgotOpen}
        onClearAuthError={props.onClearAuthError}
        biometricUnlockAvailable={props.biometricUnlockAvailable}
        onBiometricUnlock={props.onBiometricUnlock}
      />
      <ForgotPasswordModal
        visible={props.forgotVisible}
        phone={props.forgotPhone}
        code={props.forgotCode}
        password={props.forgotPassword}
        submitting={props.forgotSubmitting}
        onPhoneChange={props.onForgotPhoneChange}
        onCodeChange={props.onForgotCodeChange}
        onPasswordChange={props.onForgotPasswordChange}
        onClose={props.onForgotClose}
        onSendCode={props.onForgotSendCode}
        onSubmit={props.onForgotSubmit}
      />
    </Modal>
  );
}

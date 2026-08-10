import { useState } from "react";
import type { AppView } from "../components/mainTabs/appViews";
import { useAuth } from "./useAuth";
import { useAppAuthGate } from "./useAppAuthGate";

type Params = {
  resetTo: (tab: AppView) => void;
};

/** Auth API state, login modal gate, and registration form fields. */
export function useAppAuthSession({ resetTo }: Params) {
  const auth = useAuth();
  const { token, phone, password, submitting, setPhone, setPassword, restoreToken, login, register, logout } = auth;
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const { loginVisible, setLoginVisible, openLoginPage, requireAuth } = useAppAuthGate({ token, resetTo });

  return {
    token,
    phone,
    password,
    submitting,
    setPhone,
    setPassword,
    restoreToken,
    login,
    register,
    logout,
    confirmPassword,
    setConfirmPassword,
    inviteCode,
    setInviteCode,
    loginVisible,
    setLoginVisible,
    openLoginPage,
    requireAuth,
  };
}

export type AppAuthSession = ReturnType<typeof useAppAuthSession>;

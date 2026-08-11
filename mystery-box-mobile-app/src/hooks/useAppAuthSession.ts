import { useCallback, useEffect, useState } from "react";
import type { AppView } from "../components/mainTabs/appViews";
import {
  clearPendingInviteCode,
  loadPendingInviteCode,
  savePendingInviteCode,
} from "../utils/inviteCodeStorage";
import { useAuth } from "./useAuth";
import { useAppAuthGate } from "./useAppAuthGate";

type Params = {
  resetTo: (tab: AppView) => void;
};

/** Auth API state, login modal gate, and registration form fields. */
export function useAppAuthSession({ resetTo }: Params) {
  const auth = useAuth();
  const { token, phone, password, submitting, setPhone, setPassword, restoreToken, login, loginWithSms, loginWithZalo, register, logout } =
    auth;
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCodeState] = useState("");
  const { loginVisible, setLoginVisible, openLoginPage, requireAuth } = useAppAuthGate({ token, resetTo });

  useEffect(() => {
    let cancelled = false;
    void loadPendingInviteCode().then((code) => {
      if (!cancelled && code) {
        setInviteCodeState(code);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setInviteCode = useCallback((code: string) => {
    setInviteCodeState(code);
    void savePendingInviteCode(code);
  }, []);

  const clearInviteCode = useCallback(() => {
    setInviteCodeState("");
    void clearPendingInviteCode();
  }, []);

  return {
    token,
    phone,
    password,
    submitting,
    setPhone,
    setPassword,
    restoreToken,
    login,
    loginWithSms,
    loginWithZalo,
    register,
    logout,
    confirmPassword,
    setConfirmPassword,
    inviteCode,
    setInviteCode,
    clearInviteCode,
    loginVisible,
    setLoginVisible,
    openLoginPage,
    requireAuth,
  };
}

export type AppAuthSession = ReturnType<typeof useAppAuthSession>;

import { useCallback, useEffect } from "react";
import { registerExpoPushToken } from "../services/pushTokenService";
import { fetchNotificationPrefs } from "../services/notificationPrefsService";
import type { ZaloLoginPayload } from "../services/authService";
import { useAppAuthHandlers } from "./useAppAuthHandlers";
import { followNotificationDeepLink } from "./followNotificationDeepLink";
import { useAppUrlDeepLink } from "./useAppUrlDeepLink";
import { useNotificationDeepLink } from "./useNotificationDeepLink";
import { usePendingDeepLinkFlush } from "./usePendingDeepLinkFlush";
import type { AppView } from "../components/mainTabs/appViews";

type Params = {
  phone: string;
  password: string;
  setPhone: (v: string) => void;
  setPassword: (v: string) => void;
  login: () => Promise<string>;
  loginWithSms: (smsCode: string) => Promise<string>;
  loginWithZalo: (payload: ZaloLoginPayload) => Promise<string>;
  register: (inviteCode?: string, smsCode?: string) => Promise<string>;
  confirmPassword: string;
  inviteCode: string;
  setInviteCode: (code: string) => void;
  clearInviteCode?: () => void;
  setLoginVisible: (v: boolean) => void;
  token: string;
  navigate: (view: AppView) => void;
  resetTo: (view: AppView) => void;
  openOrderDetailsPage: (orderId: string) => void | Promise<void>;
  openBoxDetailsPage?: (boxId: string) => void | Promise<void>;
  refreshAllWithLoading: (token: string, options?: { includeHeavy?: boolean; includeMall?: boolean }) => Promise<void>;
  refreshServerNotifications: () => void | Promise<void>;
  newcomerClearSession: () => Promise<void>;
};

export function useAppAuthEffects(params: Params) {
  const {
    phone,
    password,
    setPhone,
    setPassword,
    login,
    loginWithSms,
    loginWithZalo,
    register,
    confirmPassword,
    inviteCode,
    setInviteCode,
    clearInviteCode,
    setLoginVisible,
    token,
    navigate,
    resetTo,
    openOrderDetailsPage,
    openBoxDetailsPage,
    refreshAllWithLoading,
    refreshServerNotifications,
    newcomerClearSession,
  } = params;

  const onAuthSuccess = useCallback(
    async (nextToken: string) => {
      resetTo("home");
      await refreshAllWithLoading(nextToken, { includeMall: false });
      await registerExpoPushToken(nextToken);
      await refreshServerNotifications();
    },
    [refreshAllWithLoading, refreshServerNotifications, resetTo],
  );

  const authHandlers = useAppAuthHandlers({
    auth: { phone, password, setPhone, setPassword, login, loginWithSms, loginWithZalo, register },
    confirmPassword,
    inviteCode,
    clearInviteCode,
    setLoginVisible,
    onAuthSuccess,
    newcomerClearSession,
  });

  useEffect(() => {
    if (!token) return;
    void registerExpoPushToken(token);
    void fetchNotificationPrefs(token).catch(() => undefined);
  }, [token]);

  const isLoggedIn = !!token;

  const applyInviteFromUrl = useCallback(
    (code: string) => {
      setInviteCode(code);
      if (!isLoggedIn) setLoginVisible(true);
    },
    [isLoggedIn, setInviteCode, setLoginVisible],
  );

  useAppUrlDeepLink({
    onInviteCode: applyInviteFromUrl,
    onAppLink: (link) =>
      followNotificationDeepLink(link, isLoggedIn, navigate, openOrderDetailsPage, openBoxDetailsPage),
  });

  useNotificationDeepLink({
    isLoggedIn,
    navigate,
    openOrderDetails: openOrderDetailsPage,
    openBoxDetails: openBoxDetailsPage,
  });

  usePendingDeepLinkFlush({
    isLoggedIn,
    navigate,
    openOrderDetails: openOrderDetailsPage,
    openBoxDetails: openBoxDetailsPage,
  });

  return { onAuthSuccess, authHandlers };
}

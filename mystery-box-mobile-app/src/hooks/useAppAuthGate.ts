import { useCallback, useState } from "react";
import type { AppView } from "../components/mainTabs/appViews";
import i18n from "../i18n";
import { toast } from "../utils/toast";

type Params = {
  token: string;
  resetTo: (tab: AppView) => void;
};

export function useAppAuthGate({ token, resetTo }: Params) {
  const [loginVisible, setLoginVisible] = useState(false);

  const openLoginPage = useCallback(() => {
    resetTo("profile");
    setLoginVisible(true);
  }, [resetTo]);

  const requireAuth = useCallback(
    (action?: () => void, reasonKey = "auth.loginRequired") => {
      if (token) {
        action?.();
        return true;
      }
      toast.info(i18n.t(reasonKey));
      resetTo("profile");
      setLoginVisible(true);
      return false;
    },
    [token, resetTo],
  );

  return {
    loginVisible,
    setLoginVisible,
    openLoginPage,
    requireAuth,
  };
}

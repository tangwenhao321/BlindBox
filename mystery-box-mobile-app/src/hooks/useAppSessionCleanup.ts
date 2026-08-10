import { useCallback } from "react";
import { clearAppSession, type AppSessionCleanupDeps } from "./appSessionCleanup";

export function useAppSessionCleanup(deps: AppSessionCleanupDeps) {
  const {
    logout,
    clearAll,
    resetWallet,
    clearHomeBanner,
    resetCouponSelection,
    setActiveBox,
    setSelectedOrder,
    resetTo,
    unregisterPushToken,
  } = deps;

  const clearSession = useCallback(
    (options?: { toastUnauthorized?: boolean }) =>
      clearAppSession(
        {
          logout,
          clearAll,
          resetWallet,
          clearHomeBanner,
          resetCouponSelection,
          setActiveBox,
          setSelectedOrder,
          resetTo,
          unregisterPushToken,
        },
        options,
      ),
    [
      logout,
      clearAll,
      resetWallet,
      clearHomeBanner,
      resetCouponSelection,
      setActiveBox,
      setSelectedOrder,
      resetTo,
      unregisterPushToken,
    ],
  );

  const onRestoreFail = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const onUnauthorized = useCallback(async () => {
    await clearSession({ toastUnauthorized: true });
  }, [clearSession]);

  return { clearSession, onRestoreFail, onUnauthorized };
}

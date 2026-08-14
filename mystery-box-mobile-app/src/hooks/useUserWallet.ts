import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { parseError } from "../api";
import { getAppLocale } from "../utils/i18nLocale";
import { clearCrashMonitoringUser, setCrashMonitoringUser } from "../utils/crashMonitoring";
import { queryUserBalanceLogs } from "../services/authService";
import { formatCurrency } from "../utils/formatCurrency";
import { toast } from "../utils/toast";
import type { UserBalanceLog, UserProfile } from "../types";
import { useWalletQuery } from "../query/hooks/useWalletQuery";
import { useCouponsQuery } from "../query/hooks/useCouponsQuery";
import { queryClient } from "../query/queryClient";
import { queryKeys } from "../query/keys";
import { fetchCouponsQuery, fetchWalletQuery } from "../query/fetchers";

export function useUserWallet(token: string) {
  const { t } = useTranslation();
  const walletQuery = useWalletQuery(token);
  const couponsQuery = useCouponsQuery(token);
  const [balanceUpdatedAt, setBalanceUpdatedAt] = useState<Date | null>(null);
  const [balanceLogs, setBalanceLogs] = useState<UserBalanceLog[]>([]);
  const [balanceLogsLoading, setBalanceLogsLoading] = useState(false);
  const [balanceLogsLoadError, setBalanceLogsLoadError] = useState<string | null>(null);
  const [refreshingBalance, setRefreshingBalance] = useState(false);

  const userProfile = walletQuery.data ?? null;
  const balance = Number(userProfile?.balance ?? 0);
  const couponCount = couponsQuery.data?.length ?? 0;

  useEffect(() => {
    if (!token || !userProfile) {
      clearCrashMonitoringUser();
      return;
    }
    setCrashMonitoringUser({ id: userProfile.id, phone: userProfile.phone });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional deps
  }, [token, userProfile?.id, userProfile?.phone]);

  const refreshBalance = useCallback(
    async (usingToken = token) => {
      const me = await queryClient.fetchQuery({
        queryKey: queryKeys.wallet.profile(usingToken),
        queryFn: () => fetchWalletQuery(usingToken),
        staleTime: 0,
      });
      const nextBalance = Number(me.balance ?? 0);
      setBalanceUpdatedAt(new Date());
      return nextBalance;
    },
    [token],
  );

  const loadCouponCount = useCallback(
    async (usingToken = token) => {
      await queryClient.fetchQuery({
        queryKey: queryKeys.coupons.list(usingToken),
        queryFn: () => fetchCouponsQuery(usingToken),
        staleTime: 0,
      });
    },
    [token],
  );

  const loadBalanceLogs = useCallback(
    async (usingToken = token) => {
      setBalanceLogsLoading(true);
      setBalanceLogsLoadError(null);
      try {
        const logs = await queryUserBalanceLogs(usingToken, 50);
        setBalanceLogs(logs);
      } catch (error) {
        setBalanceLogsLoadError(parseError(error));
      } finally {
        setBalanceLogsLoading(false);
      }
    },
    [token],
  );

  const onRefreshBalance = useCallback(
    async (onError?: (message: string) => void) => {
      setRefreshingBalance(true);
      try {
        const latestBalance = await refreshBalance(token);
        toast.success(t("wallet.balanceRefreshed", { amount: formatCurrency(latestBalance) }));
      } catch (error) {
        const message = parseError(error);
        onError?.(message);
        toast.error(message);
      } finally {
        setRefreshingBalance(false);
      }
    },
    [refreshBalance, t, token],
  );

  const resetWallet = useCallback(() => {
    setBalanceUpdatedAt(null);
    setBalanceLogs([]);
    setBalanceLogsLoadError(null);
  }, []);

  const locale = getAppLocale();
  const balanceUpdatedAtText = useMemo(() => {
    if (balanceUpdatedAt) {
      return t("wallet.updatedAt", { time: balanceUpdatedAt.toLocaleTimeString(locale, { hour12: false }) });
    }
    if (walletQuery.dataUpdatedAt > 0) {
      return t("wallet.updatedAt", {
        time: new Date(walletQuery.dataUpdatedAt).toLocaleTimeString(locale, { hour12: false }),
      });
    }
    return t("wallet.notSynced");
  }, [balanceUpdatedAt, locale, t, walletQuery.dataUpdatedAt]);

  return {
    userProfile: userProfile as UserProfile | null,
    balance,
    balanceText: t("wallet.balanceText", { amount: formatCurrency(balance) }),
    balanceUpdatedAtText,
    balanceLogs,
    balanceLogsLoading,
    balanceLogsLoadError,
    refreshingBalance,
    couponCount,
    refreshBalance,
    loadCouponCount,
    loadBalanceLogs,
    onRefreshBalance,
    resetWallet,
  };
}

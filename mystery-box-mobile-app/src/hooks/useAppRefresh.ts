import { useCallback } from "react";
import { parseError, toAppError } from "../api";
import i18n from "../i18n";
import { trackEvent } from "../utils/analytics";
import { invalidateAppQueries } from "../utils/invalidateAppQueries";
import { reportAppError } from "../utils/crashReport";
import { classifyRefreshIssues } from "../utils/refreshErrorPolicy";
import { toast } from "../utils/toast";

type RefreshOptions = { includeHeavy?: boolean; includeMall?: boolean };

type Params = {
  token: string;
  refreshAll: (token: string, options?: { includeMall?: boolean }) => Promise<string[]>;
  refreshBalance: (token: string) => Promise<unknown>;
  loadCouponCount: (token: string) => Promise<unknown>;
  loadHomeBanner: (token: string) => Promise<void>;
  loadBalanceLogs: (token: string) => Promise<unknown>;
  setGlobalErrors: (messages: string[]) => void;
  setPageLoading: (loading: boolean) => void;
};

export function useAppRefresh(params: Params) {
  const {
    token,
    refreshAll,
    refreshBalance,
    loadCouponCount,
    loadHomeBanner,
    loadBalanceLogs,
    setGlobalErrors,
    setPageLoading,
  } = params;

  return useCallback(
    async (usingToken = token, options?: RefreshOptions) => {
      setGlobalErrors([]);
      setPageLoading(true);
      try {
        if (!usingToken) {
          await refreshAll(usingToken);
          await loadHomeBanner(usingToken);
          return;
        }
        const core = await Promise.allSettled([
          refreshAll(usingToken, { includeMall: options?.includeMall }),
          refreshBalance(usingToken),
          loadCouponCount(usingToken),
          loadHomeBanner(usingToken),
        ]);
        const catalogResult = core[0];
        const partialErrors =
          catalogResult.status === "fulfilled" && Array.isArray(catalogResult.value)
            ? catalogResult.value
            : [];
        const refreshIssues: string[] = [...partialErrors];
        if (catalogResult.status === "rejected") {
          refreshIssues.unshift(parseError(catalogResult.reason));
        }
        const balanceResult = core[1];
        if (balanceResult.status === "rejected") {
          refreshIssues.push(i18n.t("dataSync.balanceError", { message: parseError(balanceResult.reason) }));
        }
        if (options?.includeHeavy !== false) {
          try {
            await loadBalanceLogs(usingToken);
          } catch (error) {
            refreshIssues.push(i18n.t("dataSync.balanceLogsError", { message: parseError(error) }));
          }
        }
        if (refreshIssues.length) {
          const catalogRejected = catalogResult.status === "rejected";
          const { blocking, advisory } = classifyRefreshIssues(refreshIssues, catalogRejected);
          if (blocking.length) {
            setGlobalErrors(blocking);
          }
          if (advisory.length) {
            toast.info(i18n.t("dataSync.partialSyncFailed", { message: advisory[0] }));
          }
          const message = refreshIssues.join(" · ");
          trackEvent(
            catalogRejected ? "global_refresh_error" : "global_refresh_partial_error",
            { message, blocking: blocking.length, advisory: advisory.length },
          );
          if (catalogRejected) {
            reportAppError(toAppError(catalogResult.reason), "global_refresh");
          }
        } else if (usingToken) {
          invalidateAppQueries(usingToken);
        }
      } finally {
        setPageLoading(false);
      }
    },
    [
      token,
      refreshAll,
      refreshBalance,
      loadCouponCount,
      loadHomeBanner,
      loadBalanceLogs,
      setGlobalErrors,
      setPageLoading,
    ],
  );
}

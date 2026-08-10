import { useCallback } from "react";
import { parseError } from "../api";
import i18n from "../i18n";
import { isFeatureTitleAccessible } from "../config/featureAccess";
import { resolveFeatureRoute } from "../config/featureRegistry";
import type { AppPublicConfig } from "../services/appConfigService";
import { checkIn } from "../services/welfareService";
import { getReferralStats } from "../services/referralService";
import { getAppLocale } from "../utils/i18nLocale";
import { openContactSupport, openEnterpriseWechat, openZaloSupport } from "../utils/contactSupport";
import { shareInviteLink } from "../utils/shareInvite";
import { toast } from "../utils/toast";
import type { AppView } from "../components/mainTabs/appViews";

type Params = {
  token: string;
  setView: (view: AppView) => void;
  supportPhone?: string;
  enterpriseWechat?: string;
  featureFlags?: AppPublicConfig["featureFlags"];
};

export function useFeatureNavigation({ token, setView, supportPhone, enterpriseWechat, featureFlags }: Params) {
  const openFeaturePage = useCallback(
    async (title: string) => {
      if (!isFeatureTitleAccessible(title, featureFlags)) {
        toast.info(i18n.t("featureDisabled"));
        return;
      }
      const route = resolveFeatureRoute(title);
      if (route?.type === "view") {
        setView(route.view);
        return;
      }
      if (route?.type === "action") {
        if (route.action === "shareInvite") {
          try {
            const stats = await getReferralStats(token);
            await shareInviteLink(stats.inviteCode);
          } catch (error) {
            toast.error(parseError(error));
          }
          return;
        }
        if (route.action === "contactSupport") {
          if (getAppLocale() === "vi-VN") {
            await openZaloSupport();
          } else {
            await openContactSupport(supportPhone);
          }
          return;
        }
        if (route.action === "enterpriseWechat") {
          await openEnterpriseWechat(enterpriseWechat);
        }
      }
    },
    [enterpriseWechat, featureFlags, setView, supportPhone, token],
  );

  const quickCheckIn = useCallback(async () => {
    try {
      const result = await checkIn(token);
      toast.success(i18n.t("welfare.checkInSuccess", { coins: result.todayRewardCoins }));
    } catch (error) {
      toast.error(parseError(error));
    }
  }, [token]);

  return { openFeaturePage, quickCheckIn };
}

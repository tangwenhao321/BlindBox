import { useEffect, useState } from "react";
import {
  clearNewcomerSessionDismissed,
  dismissNewcomerForSession,
  hasOpenedBlindBox,
  isNewcomerSessionDismissed,
  shouldShowNewcomerOfferAsync,
  markUserHasPurchased,
} from "../utils/newcomerOffer";
import { markOnboardingDone } from "../components/OnboardingOverlay";
import { markOnboardingCoachDone } from "../utils/onboardingCoachStorage";
import type { Order } from "../types";

export function useNewcomerOffer(orders: Order[], authenticated: boolean, ordersReady = true) {
  const [visible, setVisible] = useState(false);
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    if (!authenticated || !ordersReady) {
      setEligible(false);
      setVisible(false);
      return;
    }
    void (async () => {
      if (hasOpenedBlindBox(orders)) {
        await markUserHasPurchased();
        await markOnboardingDone();
        await markOnboardingCoachDone();
        setEligible(false);
        setVisible(false);
        return;
      }
      const sessionDismissed = await isNewcomerSessionDismissed();
      const nextEligible = await shouldShowNewcomerOfferAsync(orders, sessionDismissed);
      setEligible(nextEligible);
      if (!nextEligible) {
        setVisible(false);
      }
    })();
  }, [authenticated, orders, ordersReady]);

  const dismiss = async () => {
    await dismissNewcomerForSession();
    setVisible(false);
    setEligible(false);
  };

  const hide = () => setVisible(false);

  const open = () => {
    // Manual bar tap should open even if auto-popup eligibility was false (e.g. session dismiss).
    if (hasOpenedBlindBox(orders)) return;
    setVisible(true);
  };

  return {
    visible,
    eligible,
    dismiss,
    hide,
    open,
    clearSessionOnAuth: clearNewcomerSessionDismissed,
  };
}

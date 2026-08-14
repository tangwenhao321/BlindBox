import { useEffect, useRef, useState, type ReactNode } from "react";
import type { PrizeRevealOptions } from "./prizeRevealTypes";
import { usePrizeRevealReanimated } from "./usePrizeRevealReanimated";
import { getRevealDriverTier, type RevealDriverTier } from "../effects/revealDriverTier";
import { trackEffectEvent } from "../effects/telemetry";

export type ReanimatedPrizeRevealApi = ReturnType<typeof usePrizeRevealReanimated> & {
  driverTier: RevealDriverTier;
  staticFallback: boolean;
};

function useDriverTierState(): RevealDriverTier {
  const [driverTier, setDriverTier] = useState(getRevealDriverTier);
  useEffect(() => {
    const id = setInterval(() => {
      const next = getRevealDriverTier();
      setDriverTier((prev) => (prev === next ? prev : next));
    }, 500);
    return () => clearInterval(id);
  }, []);
  return driverTier;
}

/**
 * Reanimated ceremony driver — kept in its own module so Metro can async-split
 * it away from the classic / Expo Go path.
 */
export function ReanimatedRevealDriver({
  options,
  children,
}: {
  options: PrizeRevealOptions;
  children: (reveal: ReanimatedPrizeRevealApi) => ReactNode;
}) {
  const reveal = useReanimatedRevealDriverApi(options);
  return children(reveal);
}

export function useReanimatedRevealDriverApi(options: PrizeRevealOptions): ReanimatedPrizeRevealApi {
  const reanimated = usePrizeRevealReanimated(options);
  const driverTier = useDriverTierState();
  const loggedRef = useRef(false);
  useEffect(() => {
    if (loggedRef.current) return;
    loggedRef.current = true;
    trackEffectEvent("reveal_driver_selected", {
      driver: driverTier === "static" ? "static" : "reanimated",
    });
  }, [driverTier]);
  return {
    ...reanimated,
    driverTier,
    staticFallback: driverTier === "static",
  };
}

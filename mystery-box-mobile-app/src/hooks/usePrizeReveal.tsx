import { useEffect, useRef, useState, type ReactNode } from "react";
import { isRunningInExpoGo } from "expo";
import type { Product } from "../types";
import type { RevealPacing } from "../effects/revealSequence";
import type { ReduceMotionLevel } from "../effects/revealRemote";
import { trackEffectEvent } from "../effects/telemetry";
import { getRevealDriverTier, type RevealDriverTier } from "../effects/revealDriverTier";
import { isHarmonyLikeDevice } from "../effects/deviceProfile";
import { usePrizeRevealExpoGo } from "./usePrizeRevealExpoGo";
import { usePrizeRevealReanimated } from "./usePrizeRevealReanimated";

export type PrizeRevealOptions = {
  products: Product[];
  lowPerfMode: boolean;
  reduceMotion: boolean;
  reduceMotionLevel?: ReduceMotionLevel;
  autoReplay: boolean;
  soundEnabled: boolean;
  revealIndex?: number;
  totalReveals?: number;
  showBoxTeaser?: boolean;
  teaserVariant?: "full" | "mini";
  pacing?: RevealPacing;
  drawProducts?: Product[];
  prizeName?: string;
  prizeImageUri?: string;
  boxName?: string;
  boxCategoryName?: string;
  orderId?: string;
  isReplaySession?: boolean;
  hasAuth?: boolean;
  onRevealComplete?: () => void;
};

export type PrizeRevealApi =
  | (ReturnType<typeof usePrizeRevealExpoGo> & {
      driverTier: RevealDriverTier;
      staticFallback: boolean;
    })
  | (ReturnType<typeof usePrizeRevealReanimated> & {
      driverTier: RevealDriverTier;
      staticFallback: boolean;
    });

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
 * Select reveal motion driver before mounting hooks.
 * Production Android prefers Reanimated unless Expo Go / lowPerf / Harmony-like OEM.
 */
export function resolvePreferClassicRevealDriver(
  options: Pick<PrizeRevealOptions, "lowPerfMode"> & { expoGo?: boolean },
): boolean {
  const expoGo = options.expoGo ?? isRunningInExpoGo();
  if (expoGo) return true;
  if (options.lowPerfMode) return true;
  if (isHarmonyLikeDevice()) return true;
  if (getRevealDriverTier() === "static") return true;
  return false;
}

function useRevealDriverTelemetry(driver: "expo-go" | "reanimated", driverTier: RevealDriverTier) {
  const loggedRef = useRef(false);
  useEffect(() => {
    if (loggedRef.current) return;
    loggedRef.current = true;
    trackEffectEvent("reveal_driver_selected", {
      driver: driverTier === "static" ? "static" : driver,
    });
  }, [driver, driverTier]);
}

function useClassicRevealDriver(options: PrizeRevealOptions): PrizeRevealApi {
  const classic = usePrizeRevealExpoGo(options);
  const driverTier = useDriverTierState();
  useRevealDriverTelemetry("expo-go", driverTier);
  return {
    ...classic,
    driverTier,
    staticFallback: driverTier === "static",
  };
}

function useReanimatedRevealDriver(options: PrizeRevealOptions): PrizeRevealApi {
  const reanimated = usePrizeRevealReanimated(options);
  const driverTier = useDriverTierState();
  useRevealDriverTelemetry("reanimated", driverTier);
  return {
    ...reanimated,
    driverTier,
    staticFallback: driverTier === "static",
  };
}

/** Classic-only path component — mounts Expo Go / RN Animated hook exclusively. */
export function ClassicRevealDriver({
  options,
  children,
}: {
  options: PrizeRevealOptions;
  children: (reveal: PrizeRevealApi) => ReactNode;
}) {
  const reveal = useClassicRevealDriver(options);
  return children(reveal);
}

/** Reanimated-only path component — mounts Reanimated hook exclusively. */
export function ReanimatedRevealDriver({
  options,
  children,
}: {
  options: PrizeRevealOptions;
  children: (reveal: PrizeRevealApi) => ReactNode;
}) {
  const reveal = useReanimatedRevealDriver(options);
  return children(reveal);
}

/**
 * Split-component gate: selects driver first, then mounts exactly one path.
 * Prefer this when the caller can use a render-prop (avoids dual hook work).
 */
export function PrizeRevealDriver({
  options,
  children,
}: {
  options: PrizeRevealOptions;
  children: (reveal: PrizeRevealApi) => ReactNode;
}) {
  const preferClassic = resolvePreferClassicRevealDriver(options);
  if (preferClassic) {
    return (
      <ClassicRevealDriver key="classic" options={options}>
        {children}
      </ClassicRevealDriver>
    );
  }
  return (
    <ReanimatedRevealDriver key="reanimated" options={options}>
      {children}
    </ReanimatedRevealDriver>
  );
}

/**
 * Hook entry: freezes driver on first render so only one underlying hook path runs.
 * Remount the host (or use {@link PrizeRevealDriver}) to switch drivers.
 * Expo Go / lowPerf / Harmony → classic; otherwise Reanimated (incl. production Android).
 */
export function usePrizeReveal(options: PrizeRevealOptions): PrizeRevealApi {
  const driverRef = useRef<"classic" | "reanimated" | null>(null);
  if (driverRef.current === null) {
    driverRef.current = resolvePreferClassicRevealDriver(options) ? "classic" : "reanimated";
  }
  // Driver is immutable for this component instance — same branch every render.
  if (driverRef.current === "classic") {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- frozen driver; only one path for this instance
    return useClassicRevealDriver(options);
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks -- frozen driver; only one path for this instance
  return useReanimatedRevealDriver(options);
}

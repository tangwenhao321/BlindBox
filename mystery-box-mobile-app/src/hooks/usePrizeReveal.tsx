import { lazy, Suspense, use, useEffect, useRef, useState, type ReactNode } from "react";
import Constants from "expo-constants";
import type { SharedValue } from "react-native-reanimated";
import { trackEffectEvent } from "../effects/telemetry";
import { getRevealDriverTier, type RevealDriverTier } from "../effects/revealDriverTier";
import { isHarmonyLikeDevice } from "../effects/deviceProfile";
import { usePrizeRevealExpoGo } from "./usePrizeRevealExpoGo";
import type { PrizeRevealOptions } from "./prizeRevealTypes";
import { RevealSuspenseFallback } from "../components/RevealSuspenseFallback";

export type { PrizeRevealOptions } from "./prizeRevealTypes";

type ClassicPrizeRevealApi = ReturnType<typeof usePrizeRevealExpoGo> & {
  driverTier: RevealDriverTier;
  staticFallback: boolean;
};

/** Reanimated-only fields (kept structural so we don't type-import the lazy chunk). */
type ReanimatedMotionFields = {
  motionDriver: "reanimated";
  revealOpacity: SharedValue<number>;
  revealScale: SharedValue<number>;
  titlePunch: SharedValue<number>;
  rainProgress: SharedValue<number>;
  confettiProgress: SharedValue<number>;
  flashOpacity: SharedValue<number>;
  shakeX: SharedValue<number>;
  prizeCardScale: SharedValue<number>;
  prizeCardOpacity: SharedValue<number>;
  cardFlip: SharedValue<number>;
  boxTeaserOpacity: SharedValue<number>;
};

export type PrizeRevealApi =
  | ClassicPrizeRevealApi
  | (Omit<ClassicPrizeRevealApi, "motionDriver"> & ReanimatedMotionFields);

/** Async chunk for the Reanimated ceremony pack — not loaded on classic/Expo Go startup. */
function loadReanimatedDriverModule() {
  return import("./usePrizeRevealReanimatedDriver");
}

const LazyReanimatedRevealDriver = lazy(() =>
  loadReanimatedDriverModule().then((m) => ({ default: m.ReanimatedRevealDriver })),
);

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
 * Expo Go quarantine check — lightweight path only when ownership is Expo Go.
 * Production / standalone / dev-client (`appOwnership` null | "guest") → false.
 */
export function isExpoGoRevealRuntime(override?: boolean): boolean {
  if (override != null) return override;
  return Constants.appOwnership === "expo";
}

/**
 * Single reveal-driver gate.
 * - Expo Go → quarantined classic path (`usePrizeRevealExpoGo`)
 * - Production / dev-client → Reanimated (lazy), unless lowPerf / Harmony / static tier
 */
export function resolvePreferClassicRevealDriver(
  options: Pick<PrizeRevealOptions, "lowPerfMode"> & { expoGo?: boolean },
): boolean {
  // Quarantined Expo Go path — sole ownership-based branch.
  if (isExpoGoRevealRuntime(options.expoGo)) return true;
  // Device fallbacks still use RN Animated (not Expo Go–specific quarantine).
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
  // Suspends until the ceremony pack chunk loads (caller needs a Suspense boundary).
  const mod = use(loadReanimatedDriverModule());
  return mod.useReanimatedRevealDriverApi(options) as PrizeRevealApi;
}

/** Classic-only path component — mounts quarantined Expo Go / RN Animated hook exclusively. */
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

/**
 * Split-component gate: selects driver first, then mounts exactly one path.
 * Reanimated path is dynamically imported so startup does not load ceremony packs.
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
    <Suspense fallback={<RevealSuspenseFallback />}>
      <LazyReanimatedRevealDriver key="reanimated" options={options}>
        {children as never}
      </LazyReanimatedRevealDriver>
    </Suspense>
  );
}

/**
 * Hook entry: freezes driver on first render so only one underlying hook path runs.
 * Remount the host (or use {@link PrizeRevealDriver}) to switch drivers.
 * Expo Go → quarantined classic; otherwise Reanimated (production / dev-client),
 * with lowPerf / Harmony / static still able to prefer classic.
 *
 * When Reanimated is selected, this hook suspends via `use()` until the async chunk
 * loads — wrap the host in `<Suspense>` (OrderDetailsView / OrderResultModal do).
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

/** Warm the Reanimated ceremony chunk after first paint (optional). */
export function preloadReanimatedRevealDriver(): Promise<unknown> {
  return loadReanimatedDriverModule();
}

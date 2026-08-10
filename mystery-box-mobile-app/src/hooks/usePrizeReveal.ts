import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { isRunningInExpoGo } from "expo";
import type { Product } from "../types";
import type { RevealPacing } from "../effects/revealSequence";
import type { ReduceMotionLevel } from "../effects/revealRemote";
import { trackEffectEvent } from "../effects/telemetry";
import { getRevealDriverTier } from "../effects/revealDriverTier";
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

/** Expo Go 走 RN Animated；开发构建走 Reanimated 4；static 层由 RevealOverlay 渲染。 */
export function usePrizeReveal(options: PrizeRevealOptions) {
  const expoGo = isRunningInExpoGo();
  const loggedRef = useRef(false);
  const [driverTier, setDriverTier] = useState(getRevealDriverTier());
  useEffect(() => {
    const id = setInterval(() => {
      const next = getRevealDriverTier();
      setDriverTier((prev) => (prev === next ? prev : next));
    }, 500);
    return () => clearInterval(id);
  }, []);
  const reanimated = usePrizeRevealReanimated(options);
  const classic = usePrizeRevealExpoGo(options);
  useEffect(() => {
    if (loggedRef.current) return;
    loggedRef.current = true;
    trackEffectEvent("reveal_driver_selected", {
      driver: driverTier === "static" ? "static" : expoGo ? "expo-go" : "reanimated",
    });
  }, [expoGo, driverTier]);
  const staticFallback = driverTier === "static";
  // Harmony / OEM Android: Reanimated worklets often fail; RN Animated path is reliable.
  const preferClassicDriver = staticFallback || expoGo || Platform.OS === "android";
  const active = preferClassicDriver ? classic : reanimated;
  return { ...active, driverTier, staticFallback };
}
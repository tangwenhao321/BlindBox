import AsyncStorage from "@react-native-async-storage/async-storage";
import { claimSurpriseEffectBonus } from "../services/fragmentService";
import { trackEffectEvent } from "./telemetry";

const CLAIMED_KEY = "reveal_surprise_bonus_orders_v1";

async function loadClaimed(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(CLAIMED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

async function markClaimed(orderId: string): Promise<void> {
  const next = [...new Set([...(await loadClaimed()), orderId])].slice(-200);
  await AsyncStorage.setItem(CLAIMED_KEY, JSON.stringify(next));
}

export type SurpriseBonusResult = {
  fragments: number;
  alreadyGranted: boolean;
  skipped?: boolean;
};

/** Credits +1 warehouse fragment for a 5% surprise-theme open. Idempotent per order. */
export async function grantSurpriseThemeBonus(opts: {
  token?: string;
  orderId?: string;
  surprise: boolean;
}): Promise<SurpriseBonusResult | null> {
  const orderId = opts.orderId?.trim();
  if (!opts.surprise || !orderId) return null;
  const claimed = await loadClaimed();
  if (claimed.includes(orderId)) {
    return { fragments: 1, alreadyGranted: true, skipped: true };
  }
  if (!opts.token) {
    trackEffectEvent("reveal_surprise_bonus_skipped", { orderId, reason: "guest" });
    return null;
  }
  try {
    const result = await claimSurpriseEffectBonus(opts.token, orderId);
    await markClaimed(orderId);
    trackEffectEvent("reveal_surprise_bonus", {
      orderId,
      alreadyGranted: result.alreadyGranted,
      fragments: result.fragments,
    });
    return result;
  } catch {
    trackEffectEvent("reveal_surprise_bonus_failed", { orderId });
    return null;
  }
}

export function resetSurpriseBonusCacheForTests(): void {
  void AsyncStorage.removeItem(CLAIMED_KEY);
}

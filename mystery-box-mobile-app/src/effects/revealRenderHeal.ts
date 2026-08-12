import { trackEffectEvent } from "./telemetry";
import { cancelRevealMotion, releaseRevealDraw } from "./revealAssetManager";
import type { SharedValue } from "react-native-reanimated";
import { clearRevealSessionTextOnlyHeal, markRevealSessionTextOnlyHeal } from "../utils/revealSettings";

let healInFlight = false;

export async function healStuckRevealOverlay(
  drawKey: string,
  values: SharedValue<number>[],
  flashStuckMs = 4000,
): Promise<boolean> {
  if (healInFlight) return false;
  healInFlight = true;
  try {
    cancelRevealMotion(values);
    releaseRevealDraw(drawKey);
    // Session-only degrade — never persist text-only from a one-off render heal.
    markRevealSessionTextOnlyHeal();
    setTimeout(() => clearRevealSessionTextOnlyHeal(), 45_000);
    trackEffectEvent("reveal_render_heal", { flashStuckMs });
    return true;
  } finally {
    healInFlight = false;
  }
}

export function resetRevealRenderHealForTests(): void {
  healInFlight = false;
}

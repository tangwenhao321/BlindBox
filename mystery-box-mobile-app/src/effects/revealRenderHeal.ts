import { trackEffectEvent } from "./telemetry";
import { cancelRevealMotion, releaseRevealDraw } from "./revealAssetManager";
import type { SharedValue } from "react-native-reanimated";
import { setRevealTextOnlyMode } from "../utils/revealSettings";

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
    await setRevealTextOnlyMode(true);
    trackEffectEvent("reveal_render_heal", { flashStuckMs });
    return true;
  } finally {
    healInFlight = false;
  }
}

export function resetRevealRenderHealForTests(): void {
  healInFlight = false;
}

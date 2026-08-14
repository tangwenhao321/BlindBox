import { trackEvent } from "../utils/analytics";
import { mapEffectEventToBehavior, recordRevealBehavior } from "./revealBehaviorProfile";

const counters: Record<string, number> = {};

export function trackEffectEvent(event: string, payload?: Record<string, unknown>) {
  counters[event] = (counters[event] ?? 0) + 1;
  const merged = { count: counters[event], ...payload };
  trackEvent(`effect_${event}`, merged as Record<string, string | number | boolean | undefined>);
  const behavior = mapEffectEventToBehavior(event);
  if (behavior) {
    void recordRevealBehavior(behavior);
  }
  if (__DEV__) {
    // eslint-disable-next-line no-console -- intentional diagnostics
    console.log("[effect]", event, merged);
  }
}

export function getEffectCounters() {
  return { ...counters };
}

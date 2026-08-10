import { Platform } from "react-native";

export type RevealAudioRoute = "headphone" | "speaker" | "car" | "unknown";

const ROUTE_MULTIPLIER: Record<RevealAudioRoute, number> = {
  headphone: 1,
  speaker: 0.88,
  car: 0.75,
  unknown: 1,
};

let cachedRoute: RevealAudioRoute = "unknown";
let cachedMultiplier = 1;

export function getRevealAudioRoute(): RevealAudioRoute {
  return cachedRoute;
}

export function resolveAudioRouteMultiplier(): number {
  return cachedMultiplier;
}

/** Detect output route (stub when expo-av unavailable) and cache volume scale. */
export async function refreshRevealAudioRouteAdapt(): Promise<number> {
  try {
    if (Platform.OS === "web") {
      cachedRoute = "unknown";
      cachedMultiplier = 1;
      return 1;
    }
    if (Platform.isTV) {
      cachedRoute = "speaker";
    } else {
      cachedRoute = "unknown";
    }
    cachedMultiplier = ROUTE_MULTIPLIER[cachedRoute];
    return cachedMultiplier;
  } catch {
    cachedRoute = "unknown";
    cachedMultiplier = 1;
    return 1;
  }
}

export function setRevealAudioRouteForTests(route: RevealAudioRoute): void {
  cachedRoute = route;
  cachedMultiplier = ROUTE_MULTIPLIER[route];
}

export function resetRevealAudioRouteForTests(): void {
  cachedRoute = "unknown";
  cachedMultiplier = 1;
}

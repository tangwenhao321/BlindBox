import { loadAtmosphereProfile } from "./revealAtmosphereWorkshop";
import { resolveAtmosphereRevealOverrides, type AtmosphereRevealOverrides } from "./revealAtmosphereOverrides";

let cached: AtmosphereRevealOverrides = {};

export function getAtmosphereRevealOverrides(): AtmosphereRevealOverrides {
  return cached;
}

export async function hydrateAtmosphereRevealOverrides(): Promise<AtmosphereRevealOverrides> {
  const profile = await loadAtmosphereProfile();
  cached = resolveAtmosphereRevealOverrides(profile);
  return cached;
}

export function resetAtmosphereRevealOverridesForTests(): void {
  cached = {};
}

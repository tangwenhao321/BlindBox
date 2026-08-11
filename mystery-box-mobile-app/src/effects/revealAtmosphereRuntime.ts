import { loadAtmosphereProfile, type AtmosphereProfile } from "./revealAtmosphereWorkshop";
import { resolveAtmosphereRevealOverrides, type AtmosphereRevealOverrides } from "./revealAtmosphereOverrides";

let cached: AtmosphereRevealOverrides = {};

/** Runtime atmosphere overrides applied by overlays (alias: getAtmosphereOverrides). */
export function getAtmosphereRevealOverrides(): AtmosphereRevealOverrides {
  return cached;
}

/** @alias getAtmosphereRevealOverrides — Settings lab / overlays. */
export function getAtmosphereOverrides(): AtmosphereRevealOverrides {
  return getAtmosphereRevealOverrides();
}

export function setAtmosphereRevealOverrides(overrides: AtmosphereRevealOverrides): void {
  cached = overrides;
}

export async function hydrateAtmosphereRevealOverrides(): Promise<AtmosphereRevealOverrides> {
  const profile = await loadAtmosphereProfile();
  cached = resolveAtmosphereRevealOverrides(profile);
  return cached;
}

/** Apply a freshly saved workshop profile to runtime without re-reading storage. */
export function applyAtmosphereProfileToRuntime(profile: AtmosphereProfile): AtmosphereRevealOverrides {
  cached = resolveAtmosphereRevealOverrides(profile);
  return cached;
}

export function resetAtmosphereRevealOverridesForTests(): void {
  cached = {};
}

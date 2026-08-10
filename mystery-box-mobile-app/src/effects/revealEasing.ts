import { Easing } from "./reanimated";
import type { RevealPacing } from "./revealSequence";
import type { RevealRemoteConfig } from "./revealRemote";
import { getRevealRemoteConfig } from "./revealRemote";

export type RevealAnimPhase =
  | "teaser"
  | "charge"
  | "flip"
  | "hold"
  | "exit"
  | "finale";

export type PhaseEasingPreset = "linear" | "easeOut" | "easeIn" | "spring" | "bounce";

function mapPreset(preset: PhaseEasingPreset) {
  switch (preset) {
    case "linear":
      return Easing.linear;
    case "easeIn":
      return Easing.in(Easing.cubic);
    case "spring":
      return Easing.out(Easing.back(1.2));
    case "bounce":
      return Easing.out(Easing.elastic(1.1));
    case "easeOut":
    default:
      return Easing.out(Easing.cubic);
  }
}

export function resolvePhaseEasing(
  phase: RevealAnimPhase,
  pacing: RevealPacing,
  remote: RevealRemoteConfig = getRevealRemoteConfig(),
) {
  const presets = remote.phaseEasingPresets ?? {};
  const key =
    pacing === "finale" || pacing === "ceremony"
      ? `${phase}Finale`
      : `${phase}Normal`;
  const preset = (presets[key] ?? presets[phase] ?? "easeOut") as PhaseEasingPreset;
  if (phase === "flip" && (pacing === "finale" || pacing === "ceremony")) {
    return mapPreset((presets.flipFinale as PhaseEasingPreset) ?? "bounce");
  }
  if (phase === "exit") {
    return mapPreset((presets.exit as PhaseEasingPreset) ?? "easeIn");
  }
  return mapPreset(preset);
}

import { resolveTimeOfDayBucket } from "./revealTimeOfDay";
import { normalizeCeremonyTemplateId, type CeremonyTemplateId } from "./revealCeremonyTemplate";
import { resolvePersonaPack } from "./revealPersonaPack";
import { getRuntimeRevealCeremonyTemplateId } from "../utils/revealSettings";
import { isRevealRecordingSafeMode, resolveRecordingSafeRevealFlags } from "./revealRecordingMode";
import { isRevealMinorModeActive } from "./revealMinorMode";

/** Night + minor mode auto-switch to eyeCare; screenshot moment uses collectMinimal. */
export function resolveEffectiveCeremonyTemplateId(): CeremonyTemplateId {
  if (isRevealMinorModeActive()) return "eyeCare";
  const recording = resolveRecordingSafeRevealFlags();
  if (recording.reduceFlash && recording.reduceParticles) return "collectMinimal";
  const user = normalizeCeremonyTemplateId(getRuntimeRevealCeremonyTemplateId());
  if (user === "eyeCare" || user === "collectMinimal" || user === "efficiency" || user === "immersive") {
    return user;
  }
  const persona = resolvePersonaPack();
  if (persona === "speed") return "efficiency";
  if (persona === "immersive") return "immersive";
  const bucket = resolveTimeOfDayBucket();
  if (bucket === "night" && user === "standard") return "eyeCare";
  if (isRevealRecordingSafeMode()) return "collectMinimal";
  return user;
}

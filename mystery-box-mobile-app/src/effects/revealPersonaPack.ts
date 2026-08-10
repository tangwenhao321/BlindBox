import { loadRevealBehaviorProfile, type RevealBehaviorProfile } from "./revealBehaviorProfile";
import {
  setRuntimeRevealCeremonyTemplateId,
  type RevealCeremonyTemplateId,
} from "../utils/revealSettings";

export type RevealPersonaPack = "speed" | "immersive" | "casual" | "newcomer";

const PERSONA_TEMPLATE: Record<RevealPersonaPack, RevealCeremonyTemplateId> = {
  speed: "efficiency",
  immersive: "immersive",
  casual: "standard",
  newcomer: "standard",
};

export function resolvePersonaPack(profile?: RevealBehaviorProfile | null): RevealPersonaPack {
  const p = profile ?? { play: 0, skipOne: 0, skipRemaining: 0, accelerateTier1: 0, accelerateTier2: 0, pause: 0, complete: 0, updatedAt: 0 };
  if (p.play < 3) return "newcomer";
  const sessions = Math.max(1, p.play);
  const skipRate = (p.skipOne + p.skipRemaining * 2) / sessions;
  const accelRate = (p.accelerateTier1 + p.accelerateTier2 * 1.5) / sessions;
  const completeRate = p.complete / sessions;
  if (skipRate >= 0.4 || accelRate >= 0.3) return "speed";
  if (completeRate >= 0.55 && skipRate < 0.15) return "immersive";
  return "casual";
}

export async function applyPersonaPack(profile?: RevealBehaviorProfile | null): Promise<RevealPersonaPack> {
  const resolved = resolvePersonaPack(profile ?? (await loadRevealBehaviorProfile()));
  setRuntimeRevealCeremonyTemplateId(PERSONA_TEMPLATE[resolved]);
  return resolved;
}

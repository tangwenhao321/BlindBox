import { getRevealRemoteConfig } from "./revealRemote";

export type RevealExperimentVariant = "default" | "calm" | "turbo";

let activeVariant: RevealExperimentVariant = "default";
let configVersion: string | undefined;
let configTemplateId: string | undefined;

export function syncRevealExperimentFromConfig(templateId?: string, version?: string) {
  configTemplateId = templateId;
  configVersion = version;
  const id = (templateId ?? "").toLowerCase();
  if (id.endsWith("_turbo") || id.endsWith("-turbo")) activeVariant = "turbo";
  else if (id.endsWith("_calm") || id.endsWith("-calm")) activeVariant = "calm";
  else if (id.includes("turbo")) activeVariant = "turbo";
  else if (id.includes("calm")) activeVariant = "calm";
  else activeVariant = "default";
}

export function getActiveRevealVariant(): RevealExperimentVariant {
  return activeVariant;
}

export function getRevealExperimentMeta() {
  const remote = getRevealRemoteConfig();
  return {
    variant: activeVariant,
    configVersion: configVersion ?? remote.configVersion,
    configTemplateId: configTemplateId ?? remote.configTemplateId,
  };
}

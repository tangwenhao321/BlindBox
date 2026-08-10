export type CeremonyTemplateId =
  | "efficiency"
  | "immersive"
  | "standard"
  | "eyeCare"
  | "collectMinimal";

const TEMPLATE_TIMING: Record<CeremonyTemplateId, number> = {
  efficiency: 0.82,
  immersive: 1.18,
  standard: 1,
  eyeCare: 1,
  collectMinimal: 0.95,
};

export type CeremonyTemplateVisualScale = {
  flashScale: number;
  hapticScale: number;
  particleScale: number;
  borderEmphasis: number;
};

const TEMPLATE_VISUAL: Record<CeremonyTemplateId, CeremonyTemplateVisualScale> = {
  efficiency: { flashScale: 1, hapticScale: 1, particleScale: 1, borderEmphasis: 1 },
  immersive: { flashScale: 1.08, hapticScale: 1.1, particleScale: 1.12, borderEmphasis: 1 },
  standard: { flashScale: 1, hapticScale: 1, particleScale: 1, borderEmphasis: 1 },
  eyeCare: { flashScale: 0, hapticScale: 0.3, particleScale: 0.85, borderEmphasis: 1.05 },
  collectMinimal: { flashScale: 0.5, hapticScale: 0.85, particleScale: 0.4, borderEmphasis: 1.35 },
};

export function normalizeCeremonyTemplateId(templateId?: string | null): CeremonyTemplateId {
  if (
    templateId === "efficiency" ||
    templateId === "immersive" ||
    templateId === "eyeCare" ||
    templateId === "collectMinimal"
  ) {
    return templateId;
  }
  return "standard";
}

export function resolveCeremonyTemplateVisualScale(templateId?: string | null): CeremonyTemplateVisualScale {
  return TEMPLATE_VISUAL[normalizeCeremonyTemplateId(templateId)];
}

/** Apply efficiency vs immersive timing multipliers to a base duration (ms). */
export function mergeCeremonyTemplateScale(base: number, templateId?: string | null): number {
  const id = normalizeCeremonyTemplateId(templateId);
  return Math.round(base * TEMPLATE_TIMING[id]);
}

export function ceremonyTemplateTimingMultiplier(templateId?: string | null): number {
  return TEMPLATE_TIMING[normalizeCeremonyTemplateId(templateId)];
}

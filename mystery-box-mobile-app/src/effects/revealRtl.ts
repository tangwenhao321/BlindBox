const RTL_LANGS = new Set(["ar", "he", "fa", "ur"]);

export function isRevealRtlLocale(locale: string): boolean {
  const lang = locale.split("-")[0]?.toLowerCase() ?? locale.toLowerCase();
  return RTL_LANGS.has(lang);
}

export type RevealLayoutMirror = {
  mirrorX: boolean;
  flexDirection: "row" | "row-reverse";
};

export function mirrorRevealLayout(locale: string): RevealLayoutMirror {
  const rtl = isRevealRtlLocale(locale);
  return {
    mirrorX: rtl,
    flexDirection: rtl ? "row-reverse" : "row",
  };
}

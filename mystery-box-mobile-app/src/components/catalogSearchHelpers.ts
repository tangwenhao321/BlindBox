export const HOT_KEY_I18N = ["catalogSearch.hot1", "catalogSearch.hot2", "catalogSearch.hot3", "catalogSearch.hot4"] as const;

export function buildCatalogHotKeywords(translate: (key: string) => string, apiKeywords?: string[]): string[] {
  if (apiKeywords?.length) return apiKeywords;
  return HOT_KEY_I18N.map((key) => translate(key));
}

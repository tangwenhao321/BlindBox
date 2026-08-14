/** Deep-merge locale namespace objects (later keys win). */
export function mergeLocaleModules(
  ...modules: readonly Record<string, unknown>[]
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const mod of modules) {
    for (const [key, value] of Object.entries(mod)) {
      const prev = out[key];
      if (
        prev &&
        typeof prev === "object" &&
        !Array.isArray(prev) &&
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        out[key] = mergeLocaleModules(prev as Record<string, unknown>, value as Record<string, unknown>);
      } else {
        out[key] = value;
      }
    }
  }
  return out;
}

/** Collect leaf key paths for parity checks (e.g. "home.searchPlaceholder"). */
export function collectLocaleKeyPaths(
  obj: Record<string, unknown>,
  prefix = "",
): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...collectLocaleKeyPaths(value as Record<string, unknown>, path));
    } else {
      keys.push(path);
    }
  }
  return keys.sort();
}

/** Read a dotted locale path from a merged locale tree. */
export function getLocaleValueByPath(obj: Record<string, unknown>, keyPath: string): unknown {
  let current: unknown = obj;
  for (const segment of keyPath.split(".")) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

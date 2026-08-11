#!/usr/bin/env node
/**
 * Light mobile bundle budget gate for CI.
 *
 * Full Metro/Android size enforcement via `npx expo export --dump-sourcemap` is TODO —
 * export is too heavy/slow for the default PR job. Until then we only fail when
 * package.json dependency fan-out looks insane (proxy for install/bundle bloat).
 *
 * See docs/DEV_ONBOARDING.md § Bundle budget.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
/** Soft ceiling for direct deps+devDeps; bump intentionally if legitimately needed. */
const MAX_DIRECT_DEPS = 120;

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const depCount =
  Object.keys(pkg.dependencies ?? {}).length + Object.keys(pkg.devDependencies ?? {}).length;

if (depCount > MAX_DIRECT_DEPS) {
  console.error(
    `check-bundle-budget: package.json has ${depCount} direct dependencies (max ${MAX_DIRECT_DEPS}).`,
  );
  console.error("TODO: replace with expo export --dump-sourcemap size budget when CI time allows.");
  process.exit(1);
}

console.log(
  `check-bundle-budget: ok (${depCount} direct deps ≤ ${MAX_DIRECT_DEPS}). Metro byte budget still TODO.`,
);

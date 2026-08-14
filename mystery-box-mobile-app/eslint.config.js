// @ts-check
const { defineConfig, globalIgnores } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

/**
 * Expo 55 flat config.
 *
 * Noise policy (CI uses `eslint . --max-warnings N`):
 * - React Compiler / experimental hooks rules that flood the codebase are off
 *   (set-state-in-effect, refs, immutability, purity, use-memo). Re-enable
 *   gradually after targeted cleanups.
 * - Base `no-unused-vars` is off so it does not double-count with the
 *   `@typescript-eslint/no-unused-vars` rule from eslint-config-expo.
 * - Remaining hooks / import issues stay as warn so CI stays green without a
 *   mass rewrite (e.g. intentional frozen driver in usePrizeReveal).
 */
module.exports = defineConfig([
  globalIgnores([
    "**/node_modules/**",
    "**/.expo/**",
    "**/android/**",
    "**/ios/**",
    "**/dist/**",
    "**/dist-export/**",
    "**/coverage/**",
    "**/scripts/**",
    "eslint.config.js",
  ]),
  expoConfig,
  {
    rules: {
      "no-console": "warn",
      // Prefer the TS-aware rule from expo; base rule double-counts every hit.
      "no-unused-vars": "off",
      "react-hooks/exhaustive-deps": "warn",
      // High-churn React Compiler rules — not actionable at scale yet.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/use-memo": "off",
      // Intentionally frozen driver branch in usePrizeReveal
      "react-hooks/rules-of-hooks": "warn",
      "import/no-unresolved": "warn",
      "import/namespace": "warn",
      "import/first": "warn",
    },
  },
]);

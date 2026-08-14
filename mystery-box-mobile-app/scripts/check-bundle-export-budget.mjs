#!/usr/bin/env node
/**
 * Soft / optional gate for `expo export` output size.
 *
 * Why optional:
 *   Full `expo export` is too slow for default PR CI. Default `check:ci` does
 *   NOT run this script; use `check:bundle-budget` (dependency count) on PRs
 *   and this script on nightly / workflow_dispatch / local release checks.
 *
 * CI (strict by default):
 *   .github/workflows/mobile-export-budget.yml
 *     - schedule: cron "0 16 * * *" (nightly 16:00 UTC)
 *     - workflow_dispatch (manual)
 *     - After `expo export`, runs `npm run check:bundle-export-budget:strict`
 *       (EXPO_EXPORT_BUDGET_STRICT=1 + --strict). Soft mode is for local use only.
 *
 * Env:
 *   SKIP_EXPO_EXPORT_BUDGET=1
 *     Exit 0 immediately (documented skip for CI matrices that lack an export).
 *   EXPO_EXPORT_BUDGET_BYTES=<number>
 *     Override the soft ceiling in bytes (default: 41943040 = 40 MiB).
 *     Used by `npm run check:bundle-export-budget:strict` (fail if over budget
 *     when an export dir exists; still soft-skips when no export dir).
 *   EXPO_EXPORT_BUDGET_STRICT=1
 *     When set, missing export output (no dist / dist-export) fails instead of
 *     exiting 0 with instructions. Pair with a prior `expo export` step.
 *     Nightly / workflow_dispatch job sets this by default.
 *   CLI: --strict
 *     Same as EXPO_EXPORT_BUDGET_STRICT=1 (used by check:bundle-export-budget:strict).
 *
 * Flow:
 *   1. Skip when SKIP_EXPO_EXPORT_BUDGET=1
 *   2. If dist-export/ or dist/ exists, measure recursive size vs budget
 *   3. Else: soft exit 0 with how-to (or fail if EXPO_EXPORT_BUDGET_STRICT=1)
 *
 * Examples:
 *   npx expo export --output-dir dist-export --platform android
 *   npm run check:bundle-export-budget
 *   EXPO_EXPORT_BUDGET_BYTES=52428800 npm run check:bundle-export-budget
 *   npm run check:bundle-export-budget:strict
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_MAX_EXPORT_BYTES = 40 * 1024 * 1024;
const CANDIDATE_DIRS = ["dist-export", "dist"];

function parseBudgetBytes() {
  const raw = process.env.EXPO_EXPORT_BUDGET_BYTES;
  if (raw == null || raw === "") {
    return DEFAULT_MAX_EXPORT_BYTES;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    console.error(
      `check-bundle-export-budget: invalid EXPO_EXPORT_BUDGET_BYTES=${JSON.stringify(raw)}`,
    );
    process.exit(2);
  }
  return Math.floor(n);
}

const MAX_EXPORT_BYTES = parseBudgetBytes();
const STRICT =
  process.env.EXPO_EXPORT_BUDGET_STRICT === "1" ||
  process.argv.includes("--strict");

if (process.env.SKIP_EXPO_EXPORT_BUDGET === "1") {
  console.log("check-bundle-export-budget: skipped (SKIP_EXPO_EXPORT_BUDGET=1).");
  process.exit(0);
}

function dirSizeBytes(dir) {
  let total = 0;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try {
      entries = readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = join(cur, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      try {
        total += statSync(full).size;
      } catch {
        /* ignore racing deletes */
      }
    }
  }
  return total;
}

function formatMb(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const found = CANDIDATE_DIRS.map((name) => join(ROOT, name)).find((p) => existsSync(p));

if (!found) {
  const msg = [
    "check-bundle-export-budget: no export output found (looked for dist-export/, dist/).",
    "Optional full gate:",
    "  npx expo export --output-dir dist-export --platform android",
    "  npm run check:bundle-export-budget",
    `Budget: ${formatMb(MAX_EXPORT_BYTES)} (override with EXPO_EXPORT_BUDGET_BYTES).`,
    "Skip: SKIP_EXPO_EXPORT_BUDGET=1. Default check:ci does not run expo export.",
  ].join("\n");
  if (STRICT) {
    console.error(msg);
    console.error(
      "check-bundle-export-budget: strict mode requires an export directory (EXPO_EXPORT_BUDGET_STRICT=1).",
    );
    process.exit(1);
  }
  console.log(msg);
  process.exit(0);
}

const size = dirSizeBytes(found);
const rel = found.slice(ROOT.length + 1);
if (size > MAX_EXPORT_BYTES) {
  console.error(
    `check-bundle-export-budget: ${rel} is ${formatMb(size)} (max ${formatMb(MAX_EXPORT_BYTES)}).`,
  );
  process.exit(1);
}

console.log(
  `check-bundle-export-budget: ok (${rel} ${formatMb(size)} ≤ ${formatMb(MAX_EXPORT_BYTES)}).`,
);

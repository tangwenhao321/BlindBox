#!/usr/bin/env bash
# Performance budget lab gate (CI-friendly constants + optional device hook).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/mystery-box-mobile-app"

echo "== Perf budget proxy (Vitest) =="
npm test -- --run src/utils/perfBudgetProxy.automation.test.ts

echo "== FPS sample fixture gate =="
PERF_FPS_SAMPLE_FILE=scripts/fps-sample.fixture.json node scripts/collect-reveal-fps.mjs

if [ "${PERF_LAB_DEVICE:-0}" = "1" ]; then
  echo "== Device FPS lab hook (requires local collector) =="
  if [ -f scripts/collect-reveal-fps.mjs ]; then
    node scripts/collect-reveal-fps.mjs
  else
    echo "WARN: scripts/collect-reveal-fps.mjs not present; proxy gate only."
  fi
else
  echo "Device FPS lab skipped (set PERF_LAB_DEVICE=1 to enable)."
fi

echo "Perf lab gate OK"

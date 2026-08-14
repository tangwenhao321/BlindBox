#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FLOWS_DIR="$ROOT/mystery-box-mobile-app/.maestro/flows"

count=$(find "$FLOWS_DIR" -maxdepth 1 -name '*.yaml' | wc -l | tr -d ' ')
min_flows=38

echo "Maestro flow files: $count (minimum $min_flows)"
if [ "$count" -lt "$min_flows" ]; then
  echo "Expected at least $min_flows Maestro flows under .maestro/flows"
  exit 1
fi

PR_SMOKE=(
  smoke.yaml
  login-smoke.yaml
  profile-smoke.yaml
  community-smoke.yaml
  deep-link-smoke.yaml
  warehouse-ship-smoke.yaml
  orders-smoke.yaml
  order-result-smoke.yaml
  reveal-share-spectator.yaml
  refunds-smoke.yaml
  mock-pay-smoke.yaml
  marketplace-smoke.yaml
  checkout-smoke.yaml
  fairness-verify-smoke.yaml
  settings-reveal-smoke.yaml
)

for flow in "${PR_SMOKE[@]}"; do
  if [ ! -f "$FLOWS_DIR/$flow" ]; then
    echo "Missing PR smoke flow: $flow"
    exit 1
  fi
done

if command -v maestro >/dev/null 2>&1 && [ "${MAESTRO_RUN_DEVICE:-0}" = "1" ]; then
  cd "$ROOT/mystery-box-mobile-app"
  maestro test --config .maestro/config.yaml "${PR_SMOKE[@]/#/.maestro/flows/}"
else
  echo "Maestro device run skipped (set MAESTRO_RUN_DEVICE=1 with emulator/farm). Flow inventory validated."
fi

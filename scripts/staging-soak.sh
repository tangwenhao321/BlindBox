#!/usr/bin/env bash
# Staging soak probe — set STAGING_BASE_URL for live checks.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${STAGING_BASE_URL:-}"

pass() { echo "[PASS] $*"; }
fail() { echo "[FAIL] $*"; FAILED=$((FAILED + 1)); }
FAILED=0

if [ -z "$BASE" ]; then
  echo "STAGING_BASE_URL not set — static doc check only."
  if [ -f "$ROOT/docs/STAGING_SOAK.md" ]; then
    pass "docs/STAGING_SOAK.md present"
    exit 0
  fi
  fail "missing docs/STAGING_SOAK.md"
  exit 1
fi

BASE="${BASE%/}"
echo "== Staging soak probe: $BASE =="

code=$(curl -sS -o /tmp/mb-health.json -w "%{http_code}" --connect-timeout 15 "$BASE/actuator/health" || true)
if [ "$code" = "200" ]; then
  pass "actuator health ($code)"
else
  fail "actuator health (HTTP $code) — try management port or -SkipActuator equivalent"
fi

code=$(curl -sS -o /tmp/mb-config.json -w "%{http_code}" --connect-timeout 15 "$BASE/front/app/config" || true)
if [ "$code" = "200" ] && grep -Eqi "currency|paymentProvider|momoEnabled|featureFlags" /tmp/mb-config.json; then
  pass "front app config ($code)"
else
  fail "front app config (HTTP $code)"
fi

code=$(curl -sS -o /tmp/mb-momo.json -w "%{http_code}" --connect-timeout 15 "$BASE/front/payment/momo/status" || true)
if [ "$code" = "200" ]; then
  pass "momo status ($code)"
else
  fail "momo status (HTTP $code)"
fi

echo "Manual next: VNPay IPN + SSE with token — see docs/STAGING_SOAK.md"
if [ "$FAILED" -gt 0 ]; then
  exit 1
fi
pass "Probe OK"
exit 0

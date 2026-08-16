# Staging soak (Boot 4.1 / VN App Store readiness)

Automated probe + manual money/SSE checklist. Does **not** replace real VNPay/WeChat sandbox IPN.

## Quick probe (no secrets)

```powershell
$env:STAGING_BASE_URL = "https://staging-api.example.com"
.\scripts\staging-soak.ps1
```

```bash
export STAGING_BASE_URL=https://staging-api.example.com
bash scripts/staging-soak.sh
```

Checks:
- `GET /actuator/health` (or `/health` if mapped)
- `GET /front/app/config` — currency/provider/momo flags
- `GET /front/payment/momo/status` — must stay not-offered on prod-vn

## Manual money path (needs sandbox keys)

| Step | Expect |
|------|--------|
| Create unpaid order → VNPay sandbox pay | Order PAID |
| Replay same IPN | Idempotent; no double draw |
| Bad signature IPN | Rejected metric / unpaid |
| Paid cancel / pity stock | Refund ticket or wallet path |
| Admin cookie login (same-origin HTTPS) | Session works; idle ~7d |

## Manual SSE (needs login token)

| Endpoint | Expect |
|----------|--------|
| `GET /front/mystery-box/{id}/draw-queue/stream` | `text/event-stream` + ping |
| Marketplace chat SSE | Connect + ping; no 401 when authed |

```bash
# Example (replace TOKEN / BOX_ID)
curl -N -H "token: TOKEN" "$STAGING_BASE_URL/front/mystery-box/BOX_ID/draw-queue/stream"
```

## Local gate (no staging)

```powershell
.\scripts\release-preflight.ps1
cd mystery-box-backend
mvn "-Dtest=ProductionSafetyValidatorTest,AppleIapVerifyServiceTest,VNPayPaymentGatewayParseTest" test
```

## Exit criteria for Boot 4.1 soak

- [ ] Probe script green on staging
- [ ] One successful VNPay (or WeChat) IPN on Boot 4.1
- [ ] SSE ping observed under Jackson 3 / Redis
- [ ] Admin cookie login round-trip
- [ ] No password hash in `GET /admin/user` list payloads

See also: `docs/SPRING_BOOT_4_MIGRATION.md`, `docs/WIPE_RESIDUAL_HARDENING.md`, `docs/VN_LAUNCH_RUNBOOK.md`.

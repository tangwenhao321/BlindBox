# Operations Runbook

On-call playbook for mystery-box commercial deployments. Pair with `docs/METRICS_ALERTS.md`, `infra/prometheus/alerts.yml`, and `infra/grafana/dashboard-mystery-box.json`.

## Roles & escalation

| Tier | Scope | Contact |
|------|--------|---------|
| L1 | App store / user reports, payment stuck | Support lead → `#ops-mystery-box` |
| L2 | Backend, DB, VNPay/WeChat callbacks | Backend on-call |
| L3 | Draw integrity, win-rule approval, data repair | Backend lead + DBA |

Escalate to L3 when: paid orders lack prizes, `ORDER_DRAW_INTEGRITY_RECONCILE` audit events fire, or win-rule metrics show unexpected hit spikes.

## Release procedure

1. **Preflight** (no device):
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\release-preflight.ps1
   ```
2. **Preflight + builds**:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\release-preflight.ps1 -RunBuild
   ```
3. **Optional E2E** (CI agent or machine with Playwright; Maestro needs emulator + `MAESTRO_RUN_DEVICE=1`):
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\release-preflight.ps1 -RunBuild -RunE2E
   ```
4. Complete `RELEASE_CHECKLIST.md` (WeChat and/or Vietnam section).
5. **Backend**: deploy jar with active profile (`prod` or `prod-vn`). Confirm `ProductionSafetyValidator` passes (no mock pay, VNPay secrets when `prod-vn`).
6. **Admin**: deploy static build; verify admin OTP and order-id-migration preflight if cutover planned.
7. **Mobile**: EAS channel build (`production` / `production-sentry` / VN profile per `docs/VN_LAUNCH_RUNBOOK.md`).
8. **Post-deploy**: confirm Prometheus alerts green, spot-check `GET /actuator/prometheus` counters, one sandbox payment (VN or WeChat per market).

## Rollback procedure

| Component | Rollback | Verify |
|-----------|----------|--------|
| Backend | Redeploy previous jar; keep DB migrations (forward-only) | Health + one read API; payment notify still reachable |
| Admin | Redeploy previous `dist` | Login + warehouse-ship list |
| Mobile | Prior EAS build / store version | Cannot force users; communicate in-app if needed |
| Config | Restore previous `application-private.yml` from secret store | Restart required |

**Do not** roll back Flyway migrations in production without a written DBA plan. Order-ID migration uses `mystery-box-backend/scripts/staging-order-id-migration.ps1` only after backup.

If payment provider config was wrong (bad IPN URL / hash secret), rollback config first, then redeploy if needed. Stuck `PENDING_PAYMENT` orders may be repaired by `PaymentReconciliationJob` (VNPay query) after secrets are fixed.

## On-call triage (first 15 minutes)

1. Check Grafana dashboard `Mystery Box — Ops` (import `infra/grafana/dashboard-mystery-box.json`).
2. Scan firing alerts from `infra/prometheus/alerts.yml`.
3. Backend logs: payment notify, `draw integrity mismatch`, warehouse fallback, push errors.
4. Admin → job run audit / ops platform for failed scheduled jobs.
5. Sentry (mobile + backend) for crash spikes correlated with release time.

## Payment fault tree

```
User reports "paid but not opened"
├─ Mobile still on PENDING_PAYMENT?
│  ├─ Yes → IPN/callback path
│  │  ├─ rate(mystery_box_payment_notify_rejected_total) up?
│  │  │  └─ VNPay: wrong hash / TMN code / IPN URL not whitelisted (VN_LAUNCH_RUNBOOK)
│  │  ├─ WeChat: notify URL unreachable or signature fail
│  │  └─ Check payment_notify_log + order status in DB
│  └─ No (PAID) → draw / warehouse path
│     ├─ GET /front/mystery-box-order/{id}/draw-integrity ok?
│     │  └─ No → OrderDrawIntegrityReconciliationJob + manual prize repair (L3)
│     └─ Yes → client cache / offline queue; ask user to pull-to-refresh orders
│
Checkout fails before pay
├─ rate(mystery_box_payment_failure_total) spike with flat orders.created?
│  └─ prepay gateway (WeChat unified / VNPay create URL)
└─ spend-limit / risk control → API error body in app
```

### VNPay-specific (prod-vn)

- IPN: `GET|POST /front/mystery-box-order/notify/pay/vnpay` must be public HTTPS.
- Return URL: `mysterybox://payment-return` (deep link); app polls order after return.
- Rejected notifies increment `mystery_box.payment.notify.rejected` — see `docs/METRICS_ALERTS.md`.
- Sandbox vs production URLs in `application-prod-vn.yml` / merchant portal.

### WeChat-specific (prod)

- Notify URL on production domain; `SignatureHeader` verification.
- Zero `payment.success` with active `orders.created` → notify regression.

## Warehouse fault tree

```
Warehouse list slow / wrong counts
├─ mystery_box_warehouse_list_sql_fallback_total > 0 sustained?
│  └─ DB indexes (Flyway V20260551_02), slow-query log
├─ Badge shows "~" approximate count?
│  └─ Expected when count SQL fallback; monitor fallback rate
└─ Ship queue backlog
   └─ Admin warehouse-ship-request; ops manual fulfillment
```

## Push notification fault tree

```
Users not receiving pushes
├─ rate(mystery_box_push_expo_failed_total) / sent high?
│  ├─ Invalid Expo tokens → user re-login / reinstall
│  └─ Expo service outage → status.expo.dev
├─ User notification prefs disabled?
│  └─ NotificationPrefGate in backend
└─ No failed metric but no delivery → client permission + FCM/APNs via Expo
```

## Draw integrity

- Nightly job: `OrderDrawIntegrityReconciliationJob` (`app.jobs.draw-integrity.*`).
- User API: `GET /front/mystery-box-order/{id}/draw-integrity`.
- Mismatches log `draw integrity mismatch` and may write audit `ORDER_DRAW_INTEGRITY_RECONCILE`.
- Alert: Loki log rule or SQL export on `audit_trail` (see alert annotation in `alerts.yml`).

Details: `docs/REVEAL_AND_OPS.md`.

## Useful commands

```bash
# Backend tests
cd mystery-box-backend && mvn test

# Mobile check
cd mystery-box-mobile-app && npm run check

# Maestro inventory (device run optional)
MAESTRO_RUN_DEVICE=1 bash scripts/maestro-ci-smoke.sh

# Staging order-id migration
cd mystery-box-backend && pwsh -File scripts/staging-order-id-migration.ps1 -Step preflight
```

## Secrets (never commit)

| Secret | Where |
|--------|--------|
| `security.admin-action-otp` | `application-private.yml` / vault |
| `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_IPN_URL` | env / private config |
| WeChat pay keys | private config |
| `EXPO_PUBLIC_SENTRY_DSN`, Sentry auth token | EAS secrets |
| DB / Redis passwords | deployment env |

Use `application-private.vn.example.yml` as a template only.

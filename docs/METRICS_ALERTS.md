# Metrics & Alerts

Micrometer counters and gauges exposed by the mystery-box backend. Wire these into Prometheus/Grafana (or your APM) and set alerts before production traffic.

## Marketplace chat SSE

| Metric | Type | Description |
|--------|------|-------------|
| `mystery_box.marketplace.chat.sse.active` | Gauge | Open chat SSE connections |
| `mystery_box.marketplace.chat.sse.opened` | Counter | Connections opened |
| `mystery_box.marketplace.chat.sse.closed` | Counter | Connections closed |
| `mystery_box.marketplace.chat.sse.broadcasts` | Counter | Broadcast fan-outs |
| `mystery_box.marketplace.chat.sse.quota_rejected` | Counter | Quota / IP / listing caps hit |

**Suggested alerts**

- **Quota rejects**: `rate(mystery_box_marketplace_chat_sse_quota_rejected_total[5m]) > 0` sustained — raise caps or investigate abuse.
- **Active connections spike**: `mystery_box_marketplace_chat_sse_active > 250` (near global cap 300).

## Payment lifecycle

| Metric | Type | Description |
|--------|------|-------------|
| `mystery_box.orders.created` | Counter | Orders created (checkout initiated) |
| `mystery_box.payment.success` | Counter | Successful payment completions |
| `mystery_box.payment.failure` | Counter | Failed prepay or payment callback |
| `mystery_box.payment.notify.rejected` | Counter | Rejected or invalid payment notify (bad signature, parse failure, idempotency skip) |

**Suggested alerts**

- **Payment failure spike**: `rate(mystery_box_payment_failure_total[5m]) / rate(mystery_box_orders_created_total[5m]) > 0.15` for 10m (tune threshold per traffic).
- **Zero successes with traffic**: `rate(mystery_box_payment_success_total[15m]) == 0` AND `rate(mystery_box_orders_created_total[15m]) > 0` for 15m — often indicates WeChat notify URL / merchant config regression.
- **Notify rejected spike**: `rate(mystery_box_payment_notify_rejected_total[5m]) > 0.05` for 5m — VNPay hash/TMN/IPN whitelist or WeChat signature issues (`PaymentMetrics.paymentNotifyRejected()`).
- **Order creation drop**: compare `rate(mystery_box_orders_created_total[1h])` week-over-week; alert on >50% drop during business hours.

Production rule bundle: `infra/prometheus/alerts.yml`. Grafana: `infra/grafana/dashboard-mystery-box.json`.

## Warehouse / ship fallback

| Metric | Type | Description |
|--------|------|-------------|
| `mystery_box.warehouse.count_sql_fallback` | Counter | Warehouse count query fell back to in-memory path |
| `mystery_box.warehouse.list_sql_fallback` | Counter | Warehouse list query fell back to in-memory path |

**Suggested alerts**

- **List fallback rate**: `rate(mystery_box_warehouse_list_sql_fallback_total[5m]) > 0` sustained 5m — investigate DB indexes (`V20260551_02`) and slow-query logs.
- **Ship queue backlog** (if exposed via ops dashboard): pending warehouse ship requests growing without admin action.

## Order ID migration (staging / cutover)

Use Admin **订单 ID 迁移** preflight (`GET /admin/order-id-migration/preflight`) before any batch rewrite:

- `legacyMapTableReady`, `migrationLogTableReady`, `warehouseIndexesReady` must all be `true`.
- Run `audit` → `prepare` → `dry-run` → `apply-one` on a sample → `apply-batch` only after DB backup.

Script: `mystery-box-backend/scripts/staging-order-id-migration.ps1` (`-Step apply-batch`).

## Push notifications (Expo)

| Metric | Type | Description |
|--------|------|-------------|
| `mystery_box.push.expo.sent` | Counter | Expo push API accepted |
| `mystery_box.push.expo.failed` | Counter | Expo push delivery failures |

**Suggested alerts**

- **Push failure ratio**: failed / (sent + failed) > 10% for 10m — see `MysteryBoxPushExpoFailed` in `infra/prometheus/alerts.yml`.

## Draw integrity (logs / audit)

No dedicated Micrometer counter yet. Reconciliation job logs `draw integrity mismatch` and may write audit action `ORDER_DRAW_INTEGRITY_RECONCILE`.

**Suggested alerts**

- Loki: `count_over_time({job=~"mystery-box.*"} |~ "draw integrity mismatch"[15m]) > 0`
- Or export `job_run_audit` failures for `OrderDrawIntegrityReconciliationJob`

See `docs/OPS_RUNBOOK.md` and `docs/REVEAL_AND_OPS.md`.

## Refund reconcile

`RefundReconciliationJob` (`app.jobs.refund-reconcile`). When Micrometer gauges/counters land, wire alert `MysteryBoxRefundReconcileStuck` (stuck/aging refunds) into `infra/prometheus/alerts.yml`.

## Mobile crash / UX (client)

- **Sentry**: set `EXPO_PUBLIC_SENTRY_DSN` and ship a Dev Client / EAS build with `@sentry/react-native`.
- **Offline queue**: monitor `offlineMutationQueue` depth in support logs; spike often correlates with API outages.

## CI smoke references

- Backend: `mvn test` (integration tests use `src/test/resources/application.yml`).
- Mobile: `npm run check`; Maestro inventory via `scripts/maestro-ci-smoke.sh`.
- Admin: Playwright `tests/e2e/smoke.spec.js` (order-id-migration, warehouse-ship mocks).

Run full preflight: `scripts/release-preflight.ps1 -RunBuild` (includes backend `mvn test`). Optional E2E: `-RunE2E` (Admin Playwright smoke + Maestro flow inventory).

## How to enable (ops — no secrets in git)

### Prometheus scrape

1. Prefer a **private management port** in prod (`management.server.port`, expose `prometheus` only there). Public port stays `health,info` (see `application-prod.yml`).
2. Point Prometheus at that scrape target; load rules from `infra/prometheus/alerts.yml`.
3. Import Grafana dashboard `infra/grafana/dashboard-mystery-box.json`.

### Mobile Sentry

| Env / flag | Where | Purpose |
|------------|--------|---------|
| `EXPO_PUBLIC_SENTRY_DSN` | EAS secrets / `.env` (never commit) | Enables `initCrashMonitoring()` in `src/utils/crashMonitoring.ts` |
| `@sentry/react-native` | optionalDependency / `npx expo install` | SDK must be present in the binary |
| EAS profile `production-sentry` | `eas.json` | Build that uploads source maps when Sentry org tokens are configured in EAS |

Without DSN, crash monitoring stays **disabled** (safe default). Status helpers: `getCrashMonitoringStatus()`.

### Backend / Admin errors

- Backend: Micrometer + optional APM agent; payment/warehouse/push counters above.
- Admin: wire your preferred frontend error reporter separately; cookie-primary deploy is documented in `docs/ADMIN_SECURITY.md`.

### Checklist alignment

Code-side scaffolding for the items above is in-repo. Marking `RELEASE_CHECKLIST.md` §5 complete still requires **deploy-time** scrape targets, alert routing, and real DSN/secrets.

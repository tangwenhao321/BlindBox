# Release Checklist (Commercial)

Items marked **[x]** are **code-done** in this repo. Unchecked items are **ops-only / external**
(credentials, deploy wiring, counsel, device QA) unless noted as still needing product/code work.

## 1) Security & Risk Control

### Code-done
- [x] Production safety validator blocks mock pay, wildcard CORS, and default/weak OTP when `prod` profile is active (`ProductionSafetyValidator`).
- [x] Default admin initializer disabled in prod profile (`security.default-admin.enabled=false`; `@ConditionalOnProperty`).
- [x] Guest analytics ingestion gated by `security.analytics.enabled` (`AnalyticsForOpsController.ingestGuest`).
- [x] Prod default `app.fairness.allow-win-rule-override=false` (`application-prod.yml` / `application-prod-vn.yml`).
- [x] Win-rule audit CSV: `GET /admin/mystery-box-win-rule/export-audit.csv`.
- [x] Win-rule approvals required before enable: create → pending; `POST .../{id}/approve` sets approved+enabled; `POST .../{id}/enable` rejects unapproved; admin panel wires approve UX.
- [x] Win-rule op/hit logs queryable in admin: `GET .../op-log` (ruleId/action/operatorId/time) + `GET .../hit-log` (userId/orderId/time) tables in `win-rule-panel.vue`.
- [x] Admin cookie auth: `.env.production` sets `VITE_ADMIN_COOKIE_AUTH=true` + `VITE_API_PREFIX=/api`; confirm same-origin nginx + CSP at deploy.
- [x] Prod YAML: `security.idempotency.required=true`, `security.sse.require-auth=true`, `security.rate-limit.distributed=true` (enforced by `ProductionSafetyValidator`).
- [x] Prod Sa-Token idle timeout: `active-timeout=604800` (7d) on `prod` / `prod-vn` (override via `SA_TOKEN_ACTIVE_TIMEOUT`).
- [x] App Attest footgun: `require-header=true` **refuses boot** until `security.ios.app-attest.verify-implemented=true` (real DeviceCheck verify).
- [x] Apple IAP scaffold: `POST /front/vip-order/{id}/iap/verify` fail-closed; prod refuses `apple.iap.enabled` until Server API wired (`docs/VN_APP_STORE_OPTIMIZATION.md`).
- [x] VN eSMS footgun: `sms.provider=vn_esms` without `app.auth.zalo-enabled=true` **refuses boot** (provider never sends).
- [x] Mobile sends `X-App-Channel` (`clientAttestation.ts` + axios/SSE); iOS production resolves `appstore` via variant (Android never reports `appstore`).
- [x] Fairness daily beacon **client+API** wired: `GET /front/fairness/daily-beacon` + `FairnessTrustRow` at checkout.

### Ops / external (not code)
- [ ] `security.admin-action-otp` is set in production private config (not default value).
- [ ] Optional `ADMIN_ACTION_TOTP_SECRET` (Base32) for rotating TOTP alongside static OTP.
- [ ] Admin high-risk unlock: `POST /admin/auth/action-grant` → subsequent calls may send `x-admin-action-otp: GRANT` (~5m Redis TTL).
- [ ] Admin operation OTP/TOTP is distributed via secure channel and rotated regularly.
- [ ] iOS App Attest **real verify**: implement Apple DeviceCheck server-side, then allow `require-header=true`.
- [ ] Fairness daily beacon mix verified in staging (API already wired).

## 2) Payment & Order Reliability

### Code-done
- [x] Daily draw-integrity reconciliation: `OrderDrawIntegrityReconciliationJob` (cron `app.jobs.draw-integrity.cron`); owner: backend on-call / ops.
- [x] Payment Micrometer counters exposed: `mystery_box.orders.created`, `mystery_box.payment.success`, `mystery_box.payment.failure`, `mystery_box.payment.notify.rejected` (`PaymentMetrics`).
- [x] Warehouse SQL fallback metrics: `mystery_box.warehouse.count_sql_fallback`, `mystery_box.warehouse.list_sql_fallback` (`WarehouseMetrics`).
- [x] MoMo / ZaloPay remain **unwired stubs** (documented; refused in `prod-vn`) — see `docs/VN_LAUNCH_RUNBOOK.md` § MoMo / ZaloPay.

### Ops / external (not code)
- [ ] WeChat pay callback URL is production domain and reachable.
- [ ] Payment callback signature verification passes in staging.
- [ ] Retry/idempotency paths are verified for pay/refund callbacks.

## 3) App UX & Stability

### Code-done
- [x] Mobile app tests and type checks pass (`npm run check`, 385 tests).
- [x] Offline mutation queue wired for address/order/community/marketplace writes (`queueIfOffline`).
- [x] Offline queue persisted to AsyncStorage (`offlineMutationStorage.ts`, survives process restart).
- [x] React Query cache persisted to AsyncStorage (`queryPersist.tsx`, 24h max age; sensitive keys excluded).
- [x] Warehouse tab badge shows approximate prefix when API count uses SQL fallback (`BottomTabBar` + `warehousePendingCountApproximate`).
- [x] MainTabs assembled input cached once per `MainTabsProvider` (`useMainTabsAssembledInput`).

### Ops / device QA
- [ ] Prize effects (visual + vibration + sound) validated on at least 2 Android devices.
- [ ] Performance mode toggle and sound toggle verified.

## 4) Build & Deploy

### Code-done
- [x] Backend unit + integration tests pass: `mvn test` (CI MySQL/Redis services; test profile disables scheduling + draw Redis listener)
- [x] Mobile tests/type-check pass: `npm run check` in `mystery-box-mobile-app`
- [x] EAS profiles: `eas.json` (development / preview / production / production-sentry)
- [x] Order ID migration tooling: Admin preflight API, audit log, `scripts/staging-order-id-migration.ps1`
- [x] Admin cookie auth: `.env.production` sets `VITE_ADMIN_COOKIE_AUTH=true` + `VITE_API_PREFIX=/api` (confirm same-origin nginx at deploy; see `docs/ADMIN_SECURITY.md`)
- [x] Spring Boot parent on supported OSS **4.1.x** (`4.1.0`). See `docs/SPRING_BOOT_4_MIGRATION.md` (compile + money-path tests green; Jackson 3 migration / staging soak still open).

### Ops / gate on each release
- [ ] Backend compile passes: `mvn -DskipTests compile`
- [ ] Admin build passes: `npm run build` in `mystery-box-admin`
- [ ] Run preflight script: `powershell -ExecutionPolicy Bypass -File .\scripts\release-preflight.ps1 -RunBuild`
- [ ] Optional E2E preflight: add `-RunE2E` (Admin Playwright smoke + Maestro inventory)
- [ ] EAS: `EXPO_PUBLIC_EAS_PROJECT_ID` must be a real project UUID for `production` / `production-vn` push (not placeholder `your-eas-project-uuid`)
- [ ] Flyway gate: migrations through latest money-security + fairness waves applied on deploy. Key versions: `V20260571` draw audit/pity, `V20260575` marketplace payout safety, `V20260576` privacy deleted_at, `V20260577` wallet ledger idempotency, `V20260582` payment notify unique, `V20260591` fairness_commit. Newest under `db/migration` includes `V20260575`–`V20260582` and `V20260591_01`.
- [ ] `production-vn` EAS: privacy/terms/support URLs must be real (build hard-fails if missing).

## 5) Operations & Monitoring

### Code-done (scaffolding)
- [x] Refund reconcile job enabled in prod YAML (`app.jobs.refund-reconcile.enabled`); alert `MysteryBoxRefundReconcileStuck` after refund metrics land in scrapes.
- [x] Analytics retention job purges events older than `security.analytics.retention-days` (`AnalyticsRetentionJob`).
- [x] Error monitoring **code ready**: mobile `EXPO_PUBLIC_SENTRY_DSN` + `@sentry/react-native`; backend Micrometer; see `docs/METRICS_ALERTS.md` § How to enable.
- [x] Alert **rules** in repo: `infra/prometheus/alerts.yml`; Grafana dashboard JSON: `infra/grafana/dashboard-mystery-box.json`.

### Ops-only (wire at deploy)
- [ ] Error monitoring enabled (backend + admin + mobile) — inject DSN/secrets; confirm events in staging.
- [ ] Alerts configured for payment failure spikes, warehouse SQL fallback, notify rejected, draw integrity, and push failures (wire routing from `infra/prometheus/alerts.yml`).
- [ ] Grafana dashboard imported (`infra/grafana/dashboard-mystery-box.json`).
- [ ] Ops runbooks reviewed: `docs/OPS_RUNBOOK.md`, `docs/VN_LAUNCH_RUNBOOK.md` (VN market).
- [ ] Rollback plan prepared (previous backend jar/admin dist/mobile build).
- [ ] Sentry source maps uploaded via `eas build --profile production-sentry` with EAS secrets configured.

## 6) Legal & Compliance (External)

### Code-done
- [x] Lottery/probability display is visible in app and matches backend config (public `GET /front/fairness/series/{id}/draw-statistics`).
- [x] User spend limit check API and order-create enforcement (`GET /front/user/compliance/spend-limit`, `UserSpendLimitService`).

### Ops / counsel
- [ ] User agreement and privacy policy published and versioned.
- [ ] Data retention/deletion request process is documented.

## 7) Vietnam market (VNPay / prod-vn)

### Code-done
- [x] Admin cookie auth: `.env.production` enables cookie-primary; confirm same-origin proxy for VN admin at deploy.
- [x] MoMo/ZaloPay stubs documented and hard-refused in `application-prod-vn.yml` (do not enable until Partner APIs exist).

### Ops / external
- [ ] `application-private.vn.example.yml` values applied via vault (never committed): `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_IPN_URL`.
- [ ] VNPay merchant IPN whitelisted: `https://YOUR_PUBLIC_API/front/mystery-box-order/notify/pay/vnpay` (GET + POST).
- [ ] Backend profile `prod-vn` validated in staging (`ProductionSafetyValidator`, sandbox pay → paid order).
- [ ] `mystery_box.payment.notify.rejected` flat after successful sandbox IPN test.
- [ ] Mobile EAS env: `EXPO_PUBLIC_PAYMENT_MODE=vnpay`, `EXPO_PUBLIC_CURRENCY=VND`, `EXPO_PUBLIC_DEFAULT_LOCALE=vi-VN` (see `mystery-box-mobile-app/.env.vn.example`).
- [ ] EAS: `EXPO_PUBLIC_EAS_PROJECT_ID` real UUID for production-vn push builds.
- [ ] Flyway gate (same as Build & Deploy): money-security waves through `V20260582` applied on VN DB.
- [ ] Legal templates counsel-reviewed and published: `docs/legal/privacy-vi-VN.template.md`, `docs/legal/terms-vi-VN.template.md`.
- [ ] Staging E2E: checkout → VNPay → return deep link → reveal → warehouse (see `docs/VN_LAUNCH_RUNBOOK.md`).

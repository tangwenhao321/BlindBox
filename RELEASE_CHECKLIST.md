# Release Checklist (Commercial)

## 1) Security & Risk Control

- [ ] `security.admin-action-otp` is set in production private config (not default value).
- [ ] Optional `ADMIN_ACTION_TOTP_SECRET` (Base32) for rotating TOTP alongside static OTP.
- [ ] Admin high-risk unlock: `POST /admin/auth/action-grant` → subsequent calls may send `x-admin-action-otp: GRANT` (~5m Redis TTL).
- [ ] Admin operation OTP/TOTP is distributed via secure channel and rotated regularly.
- [x] Production safety validator blocks mock pay, wildcard CORS, and default/weak OTP when `prod` profile is active (`ProductionSafetyValidator`).
- [x] Default admin initializer disabled in prod profile (`security.default-admin.enabled=false`; `@ConditionalOnProperty`).
- [x] Guest analytics ingestion gated by `security.analytics.enabled` (`AnalyticsForOpsController.ingestGuest`).
- [x] Prod default `app.fairness.allow-win-rule-override=false` (`application-prod.yml` / `application-prod-vn.yml`).
- [x] Win-rule audit CSV: `GET /admin/mystery-box-win-rule/export-audit.csv`.
- [ ] `mystery_box_win_rule` approvals are required before enabling.
- [ ] `mystery_box_win_rule_op_log` and `mystery_box_win_hit_log` are queryable in admin.
- [ ] iOS App Attest scaffold: set `IOS_APP_ATTEST_ENABLED` / `IOS_APP_ATTEST_REQUIRE_HEADER` only after client ships `X-Apple-App-Attest`.
- [ ] Mobile sends `X-App-Channel` (App Store builds: `appstore`) via `clientAttestation.ts`.
- [ ] Fairness daily beacon published: `GET /front/fairness/daily-beacon` (mixed into draw commits).
- [ ] Admin cookie auth (optional): `VITE_ADMIN_COOKIE_AUTH=true` + same-origin proxy; nginx CSP flags reviewed.

## 2) Payment & Order Reliability

- [ ] WeChat pay callback URL is production domain and reachable.
- [ ] Payment callback signature verification passes in staging.
- [ ] Retry/idempotency paths are verified for pay/refund callbacks.
- [x] Daily draw-integrity reconciliation: `OrderDrawIntegrityReconciliationJob` (cron `app.jobs.draw-integrity.cron`); owner: backend on-call / ops.
- [x] Payment Micrometer counters exposed: `mystery_box.orders.created`, `mystery_box.payment.success`, `mystery_box.payment.failure`, `mystery_box.payment.notify.rejected` (`PaymentMetrics`).
- [x] Warehouse SQL fallback metrics: `mystery_box.warehouse.count_sql_fallback`, `mystery_box.warehouse.list_sql_fallback` (`WarehouseMetrics`).

## 3) App UX & Stability

- [ ] Prize effects (visual + vibration + sound) validated on at least 2 Android devices.
- [ ] Performance mode toggle and sound toggle verified.
- [x] Mobile app tests and type checks pass (`npm run check`, 385 tests).
- [x] Offline mutation queue wired for address/order/community/marketplace writes (`queueIfOffline`).
- [x] Offline queue persisted to AsyncStorage (`offlineMutationStorage.ts`, survives process restart).
- [x] React Query cache persisted to AsyncStorage (`queryPersist.tsx`, 24h max age; sensitive keys excluded).
- [x] Warehouse tab badge shows approximate prefix when API count uses SQL fallback (`BottomTabBar` + `warehousePendingCountApproximate`).
- [x] MainTabs assembled input cached once per `MainTabsProvider` (`useMainTabsAssembledInput`).

## 4) Build & Deploy

- [ ] Backend compile passes: `mvn -DskipTests compile`
- [x] Backend unit + integration tests pass: `mvn test` (CI MySQL/Redis services; test profile disables scheduling + draw Redis listener)
- [ ] Admin build passes: `npm run build` in `mystery-box-admin`
- [x] Mobile tests/type-check pass: `npm run check` in `mystery-box-mobile-app`
- [ ] Run preflight script: `powershell -ExecutionPolicy Bypass -File .\scripts\release-preflight.ps1 -RunBuild`
- [ ] Optional E2E preflight: add `-RunE2E` (Admin Playwright smoke + Maestro inventory)
- [x] EAS profiles: `eas.json` (development / preview / production / production-sentry)
- [ ] EAS: `EXPO_PUBLIC_EAS_PROJECT_ID` must be a real project UUID for `production` / `production-vn` push (not placeholder `your-eas-project-uuid`)
- [x] Order ID migration tooling: Admin preflight API, audit log, `scripts/staging-order-id-migration.ps1`
- [ ] Flyway gate: migrations through latest money-security + fairness waves applied on deploy. Key versions: `V20260571` draw audit/pity, `V20260575` marketplace payout safety, `V20260576` privacy deleted_at, `V20260577` wallet ledger idempotency, `V20260582` payment notify unique, `V20260591` fairness_commit. Newest under `db/migration` includes `V20260575`–`V20260582` and `V20260591_01`.
- [ ] Admin cookie auth (optional): set `VITE_ADMIN_COOKIE_AUTH=true` and serve admin+API same-origin (see `docs/ADMIN_SECURITY.md`)
- [ ] `production-vn` EAS: privacy/terms/support URLs must be real (build hard-fails if missing).

## 5) Operations & Monitoring

- [ ] Error monitoring enabled (backend + admin + mobile).
- [ ] Alerts configured for payment failure spikes, warehouse SQL fallback, notify rejected, draw integrity, and push failures (see `docs/METRICS_ALERTS.md`, `infra/prometheus/alerts.yml`).
- [ ] Refund reconcile job enabled (`app.jobs.refund-reconcile.enabled` in prod); alert `MysteryBoxRefundReconcileStuck` after refund metrics land.
- [ ] Grafana dashboard imported (`infra/grafana/dashboard-mystery-box.json`).
- [ ] Ops runbooks reviewed: `docs/OPS_RUNBOOK.md`, `docs/VN_LAUNCH_RUNBOOK.md` (VN market).
- [x] Analytics retention job purges events older than `security.analytics.retention-days` (`AnalyticsRetentionJob`).
- [ ] Rollback plan prepared (previous backend jar/admin dist/mobile build).
- [ ] Sentry source maps uploaded via `eas build --profile production-sentry` with EAS secrets configured.

## 6) Legal & Compliance (External)

- [ ] User agreement and privacy policy published and versioned.
- [x] Lottery/probability display is visible in app and matches backend config (public `GET /front/fairness/series/{id}/draw-statistics`).
- [x] User spend limit check API and order-create enforcement (`GET /front/user/compliance/spend-limit`, `UserSpendLimitService`).
- [ ] Data retention/deletion request process is documented.

## 7) Vietnam market (VNPay / prod-vn)

- [ ] `application-private.vn.example.yml` values applied via vault (never committed): `VNPAY_TMN_CODE`, `VNPAY_HASH_SECRET`, `VNPAY_IPN_URL`.
- [ ] VNPay merchant IPN whitelisted: `https://YOUR_PUBLIC_API/front/mystery-box-order/notify/pay/vnpay` (GET + POST).
- [ ] Backend profile `prod-vn` validated in staging (`ProductionSafetyValidator`, sandbox pay → paid order).
- [ ] `mystery_box.payment.notify.rejected` flat after successful sandbox IPN test.
- [ ] Mobile EAS env: `EXPO_PUBLIC_PAYMENT_MODE=vnpay`, `EXPO_PUBLIC_CURRENCY=VND`, `EXPO_PUBLIC_DEFAULT_LOCALE=vi-VN` (see `mystery-box-mobile-app/.env.vn.example`).
- [ ] EAS: `EXPO_PUBLIC_EAS_PROJECT_ID` real UUID for production-vn push builds.
- [ ] Flyway gate (same as Build & Deploy): money-security waves through `V20260582` applied on VN DB.
- [ ] Admin cookie auth: `VITE_ADMIN_COOKIE_AUTH` + same-origin proxy when enabling cookie-primary for VN admin.
- [ ] Legal templates counsel-reviewed and published: `docs/legal/privacy-vi-VN.template.md`, `docs/legal/terms-vi-VN.template.md`.
- [ ] Staging E2E: checkout → VNPay → return deep link → reveal → warehouse (see `docs/VN_LAUNCH_RUNBOOK.md`).

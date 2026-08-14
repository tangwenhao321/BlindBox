# Vietnam Launch Runbook

Checklist for launching the Vietnam market (`prod-vn` profile, VNPay, `vi-VN` mobile build). Cross-reference `RELEASE_CHECKLIST.md` § Vietnam and `docs/OPS_RUNBOOK.md`.

## Prerequisites

- [ ] Legal templates reviewed: `docs/legal/privacy-vi-VN.template.md`, `docs/legal/terms-vi-VN.template.md` (counsel sign-off before publish).
- [ ] VNPay merchant account (sandbox validated, production TMN code issued).
- [ ] Public API hostname with TLS (IPN must be reachable from VNPay).
- [ ] EAS project + Apple/Google store listings ready for VN locale.

## VNPay merchant configuration

1. **Merchant portal** (sandbox first):
   - Register IPN URL exactly:
     `https://YOUR_PUBLIC_API/front/mystery-box-order/notify/pay/vnpay`
   - Allowed methods: GET and POST (backend exposes both).
   - Return URL for app deep link: `mysterybox://payment-return` (or production scheme).
2. **Secrets** (placeholders — set in vault / deployment env, not git):

   | Variable | Example placeholder |
   |----------|---------------------|
   | `VNPAY_TMN_CODE` | `YOUR_VNPAY_TMN_CODE` |
   | `VNPAY_HASH_SECRET` | `YOUR_VNPAY_HASH_SECRET` |
   | `VNPAY_IPN_URL` | `https://api.example.com/front/mystery-box-order/notify/pay/vnpay` |
   | `VNPAY_RETURN_URL` | `mysterybox://payment-return` |

3. **Backend config**:
   - Profile: `prod-vn` (sets `app.market.payment-provider: vnpay`, `currency: VND`).
   - Copy `mystery-box-backend/src/main/resources/application-private.vn.example.yml` → private overlay.
   - `ProductionSafetyValidator` refuses start without `vnpay.tmn-code` and `vnpay.hash-secret` in production.
   - Sandbox URLs (default in `application-prod-vn.yml`):
     - Pay: `https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`
     - Query: `https://sandbox.vnpayment.vn/merchant_webapi/api/transaction`
   - Production: switch `vnpay.sandbox: false` and production pay/query URLs per VNPay docs.

4. **IPN verification staging test**:
   - Create order in staging app → complete sandbox pay.
   - Confirm order → `PAID`, `mystery_box.payment.success` increments.
   - Send invalid signature replay → `mystery_box.payment.notify.rejected` increments; order stays unpaid.

## MoMo / ZaloPay (unwired stubs — do not enable in prod-vn)

Checkout and marketplace payout for MoMo/ZaloPay are **intentionally unwired stubs** kept in tree for future Partner work:

| Surface | Classes | Prod-vn gate |
| --- | --- | --- |
| MoMo checkout | `MoMoPaymentGateway` (+ `payment.gateway` package-info) | `momo.enabled=false`, `stub=true`, `partner-wired=false` |
| MoMo / ZaloPay marketplace payout | `*MarketplacePayoutGateway` | `isReady()==false`; keep `app.marketplace.payout-gateway=wallet` |
| ZaloPay config | `ZaloPayProperties` | payout-only; no checkout gateway yet |

`ProductionSafetyValidator` refuses offering stub MoMo or flipping `partner-wired` before Partner HTTP exists. Do not delete stub classes; do not set `enabled=true` until create/IPN/HMAC (checkout) or disbursement (payout) is implemented.
   - Check `payment_notify_log` row for idempotency.

5. **Reconciliation**: `PaymentReconciliationJob` queries VNPay for stuck `PENDING_PAYMENT` orders after IPN outages.

## Mobile EAS environment (Vietnam)

Reference: `mystery-box-mobile-app/.env.vn.example`

| EAS secret / env | Value |
|------------------|--------|
| `EXPO_PUBLIC_DEFAULT_LOCALE` | `vi-VN` |
| `EXPO_PUBLIC_CURRENCY` | `VND` |
| `EXPO_PUBLIC_PAYMENT_MODE` | `vnpay` |
| `EXPO_PUBLIC_MOCK_PAYMENT` | `false` |
| `EXPO_PUBLIC_API_BASE_URL` | `https://YOUR_PUBLIC_API` |
| `EXPO_PUBLIC_SUPPORT_PHONE` | `+84XXXXXXXXX` |
| `EXPO_PUBLIC_ZALO_OA_ID` | `your-zalo-oa-id` |
| `EXPO_PUBLIC_SENTRY_DSN` | `https://xxx@o000.ingest.sentry.io/000` (optional) |

Suggested `eas.json` profile (add locally if not present):

```json
"production-vn": {
  "extends": "production",
  "env": {
    "EXPO_PUBLIC_DEFAULT_LOCALE": "vi-VN",
    "EXPO_PUBLIC_CURRENCY": "VND",
    "EXPO_PUBLIC_PAYMENT_MODE": "vnpay",
    "EXPO_PUBLIC_MOCK_PAYMENT": "false"
  },
  "channel": "production-vn"
}
```

Build:

```bash
cd mystery-box-mobile-app
eas build --profile production-vn --platform all
```

Use **development client** for reveal QA (`docs/NATIVE_BUILD.md`); Expo Go is insufficient for Reanimated reveal.

## Staging steps (end-to-end)

1. Deploy backend with `spring.profiles.active=prod-vn` + private VN secrets on staging host.
2. Whitelist staging IPN URL in VNPay sandbox merchant.
3. Point mobile staging build at staging API (`EXPO_PUBLIC_API_BASE_URL`).
4. Run preflight:
   ```powershell
   .\scripts\release-preflight.ps1 -RunBuild
   ```
5. Manual flows:
   - Register / login
   - Create order → VNPay WebView checkout (`VNPayCheckoutModal`)
   - Return deep link → order paid → reveal → warehouse entry
   - Cancel payment → `payment_cancel` analytics event
6. Admin: verify paid order, warehouse ship request, spend-limit if enabled.
7. Import `infra/prometheus/alerts.yml` and Grafana dashboard; confirm metrics scrape from staging actuator.
8. Promote to production: rotate secrets, update IPN to production URL, disable sandbox flag.

## Monitoring (VN-specific)

- Alert `MysteryBoxPaymentNotifyRejected` — often wrong `hash-secret` or IPN URL mismatch.
- Alert `MysteryBoxPaymentFailureSpike` — prepay or gateway downtime.
- Dashboard panels: payment success/failure ratio, notify rejected rate.

## Rollback (VN)

1. Disable VN store rollout; keep backend on previous jar if release-related.
2. If only VNPay config wrong: fix `VNPAY_*` env and restart (no jar rollback).
3. Switch mobile channel back to previous build via EAS / store.
4. Communicate support script: users with pending payment should retry after fix; reconciliation job may complete paid state.

## Support macros (Vietnamese)

- Payment pending: ask user to open Orders → pull refresh; if still pending, collect `orderId` and check IPN logs.
- Paid no prizes: check `draw-integrity` API response; escalate L3 if `ok: false`.

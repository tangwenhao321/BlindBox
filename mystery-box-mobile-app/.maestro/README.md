# Maestro E2E flows

## Workspace config

`config.yaml` sets the default **`appId: mystery-box-mobile-app`** and discovers all flows under `flows/**`.

Run the full suite:

```bash
cd mystery-box-mobile-app
maestro test --config .maestro/config.yaml
```

Run a single flow (each file also declares `appId` for standalone runs):

```bash
maestro test .maestro/flows/smoke.yaml
```

## Flow inventory (39)

PR smoke flows (also validated in CI inventory): `smoke`, `login-smoke`, `profile-smoke`, `community-smoke`, `deep-link-smoke`, `warehouse-ship-smoke`, `orders-smoke`, `order-result-smoke`, `reveal-share-spectator`.

`reveal-share-spectator.yaml` requires backend `app.reveal.e2e-fixture.enabled=true` when running on device.

| Flow | Purpose |
|------|---------|
| `smoke.yaml` | App launch + conditional login |
| `login-smoke.yaml` | Credential login |
| `checkout-smoke.yaml` | Checkout path |
| `mock-pay-smoke.yaml` | Mock payment + order result |
| `order-result-smoke.yaml` | Order result modal |
| `queue-checkout-smoke.yaml` | Queue checkout |
| `favorites-smoke.yaml` | Favorites tab |
| `messages-smoke.yaml` | Message center |
| `orders-smoke.yaml` | Orders list filters |
| `pending-payment-smoke.yaml` | Pending payment |
| `refunds-smoke.yaml` | Refund records |
| `warehouse-smoke.yaml` | Warehouse tab |
| `warehouse-ship-smoke.yaml` | Ship request |
| `marketplace-smoke.yaml` | Marketplace browse |
| `address-manage-smoke.yaml` | Address management |
| `settings-env-smoke.yaml` | Settings / API env |
| `settings-reveal-smoke.yaml` | Reveal settings |
| `deep-link-smoke.yaml` | `mysterybox://messages` |
| `deep-link-order-smoke.yaml` | Order deep link |
| `offline-blocked-submit-smoke.yaml` | Offline guard |
| `push-deeplink-mock.yaml` | Push-mapped deeplinks (refunds, community, marketplace) |
| `profile-smoke.yaml` | Profile tab + orders shortcut |
| `community-smoke.yaml` | Community / 晒单墙 |
| `fairness-verify-smoke.yaml` | Order fairness verification |
| `balance-logs-smoke.yaml` | Balance logs screen |
| `search-smoke.yaml` | Catalog search + hot keywords |
| `recommend-smoke.yaml` | Home recommend carousel |
| `notifications-smoke.yaml` | Notification center |
| `cabinet-reserve-smoke.yaml` | Cabinet slot reserve |
| `newcomer-missions-smoke.yaml` | Newcomer missions modal |
| `queue-room-smoke.yaml` | Draw queue room sheet |
| `reveal-share-spectator.yaml` | Share + spectator deep link (needs E2E fixture) |
| `locale-vi-smoke.yaml` | Vietnamese locale smoke |
| `vnpay-smoke.yaml` | VNPay checkout path |

## npm script

From `mystery-box-mobile-app`:

```bash
npm run test:e2e
```

Requires a **simulator or physical device** with the app installed (Expo Dev Client or release build). Maestro CLI must be on your `PATH`. See `appId matrix` below for runtime IDs.

## appId matrix

All flows in `flows/` default to **`mystery-box-mobile-app`** (CI / dev-client slug), also set in `config.yaml`.

| Runtime | Maestro `appId` | When to use |
|--------|-----------------|-------------|
| CI / dev client | `mystery-box-mobile-app` | Default for `.github/workflows/ci.yml` and local dev builds |
| Expo Go | `host.exp.exponent` | Quick manual runs against `expo start --go` without a custom dev client |
| Release native (iOS/Android) | `com.mysterybox.mobile` | Store / release builds from `app.config.js` |

Override for a one-off run:

```bash
maestro test -e APP_ID=host.exp.exponent .maestro/flows/smoke.yaml
```

Or edit the first line of a flow file before running locally.

## reveal-share-spectator

Validates share CTA on the order result sheet and spectator deep link UI (`spectatorScreen` / `spectatorProgress`).

Requires backend E2E fixture:

```yaml
app:
  reveal:
    e2e-fixture:
      enabled: true
```

This seeds spectator token `e2e-spectator` for order `e2e-smoke-order`.

```bash
maestro test .maestro/flows/reveal-share-spectator.yaml
```

## Credentials

Login flows read `MAESTRO_TEST_PHONE` and `MAESTRO_TEST_PASSWORD` (see repo CI vars or `.env.example`).

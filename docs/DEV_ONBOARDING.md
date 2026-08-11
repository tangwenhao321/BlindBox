# Day-1 developer onboarding

English quickstart for cloning and running the mystery-box stack locally.

## 1. Clone

```bash
git clone <repo-url> mystery-box-main
cd mystery-box-main
```

Optional local deps (MySQL + Redis):

```bash
docker compose -f docker-compose.local.yml up -d
```

## 2. Backend (`mystery-box-backend`)

Default Spring profiles are **`dev,private`** (`application.yml`).

1. Copy secrets template:

   ```bash
   cp src/main/resources/application-private.example.yml src/main/resources/application-private.yml
   ```

2. Edit `application-private.yml` (DB password, WeChat/OSS stubs, admin seed password, etc.).

3. Start (Flyway runs on boot; `application-dev.yml` enables `baseline-on-migrate` / `out-of-order` for local):

   ```bash
   cd mystery-box-backend
   mvn spring-boot:run
   ```

   API default: `http://localhost:9912`

Migrations live under `src/main/resources/db/migration/`.

## 3. Mobile (`mystery-box-mobile-app`)

```bash
cd mystery-box-mobile-app
npm ci
cp .env.example .env   # set EXPO_PUBLIC_API_BASE_URL to your LAN IP:9912
npm start              # Expo on port 8083
```

Day-1 checks:

```bash
npm run check          # tsc + vitest + Maestro flow validate
```

Bundle size: CI runs `npm run check:bundle-budget` (light dependency sanity). Full `npx expo export --dump-sourcemap` budget gating is **TODO** — see that script’s header comment.

## 4. Admin (`mystery-box-admin`)

```bash
cd mystery-box-admin
npm ci
npm run dev            # or project’s documented start script
```

Point the admin API base at the local backend (`9912`) per admin `.env` / Vite config.

## 5. Secrets checklist

| Item | Where |
|------|--------|
| DB username/password | `application-private.yml` |
| Redis (if not defaults) | `application-dev.yml` / private |
| WeChat miniapp + pay stubs | `application-private.yml` (`wx.*`) |
| OSS / local uploads | `oss.*` in private |
| Admin seed account | `security.default-admin.*` in private |
| Admin OTP (ops actions) | `security.admin-action-otp` |
| Mobile API URL | `mystery-box-mobile-app/.env` → `EXPO_PUBLIC_API_BASE_URL` |
| Invite H5 base (optional) | `EXPO_PUBLIC_INVITE_BASE_URL` |
| Payment mock | `payment.mock-enabled` / `EXPO_PUBLIC_MOCK_PAYMENT` |

Never commit `application-private.yml` or real `.env` secrets.

## 6. Related runbooks

- [BACKUP_RESTORE_RUNBOOK.md](./BACKUP_RESTORE_RUNBOOK.md) — MySQL / Redis backup & restore
- [VN_LAUNCH_RUNBOOK.md](./VN_LAUNCH_RUNBOOK.md) — Vietnam / VNPay launch
- [INVITE_ATTRIBUTION.md](./INVITE_ATTRIBUTION.md) — invite deep link → register
- [TEST_ENV_GUIDE.md](./TEST_ENV_GUIDE.md) — isolated test server
- [../MOBILE_APP_SETUP.md](../MOBILE_APP_SETUP.md) — mobile API, SSE, payments

## Bundle budget (CI)

Mobile CI already runs `npm run check`. A light `scripts/check-bundle-budget.mjs` fails only if `package.json` dependency count looks insane. Enforcing a Metro/Android byte budget via `expo export` is deferred (TODO in that script and in `.github/workflows/mobile-app-ci.yml`).

# Backup & Restore Runbook

Short ops checklist for MySQL + Redis. Pair with `docs/OPS_RUNBOOK.md` and marketplace **PENDING_EXTERNAL** handling in admin.

## Before you start

- [ ] Confirm environment (`prod` / `prod-vn`) and DB host from vault / private config.
- [ ] Schedule a maintenance window for restore; dump alone is online-safe with `--single-transaction`.
- [ ] Note current app jar version and Flyway migration version (`flyway_schema_history`).

## MySQL dump

```bash
# Logical backup (InnoDB-safe). Replace host/user/db from private config.
mysqldump \
  -h "$MYSQL_HOST" -P "${MYSQL_PORT:-3306}" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" \
  --single-transaction --routines --triggers --hex-blob \
  --databases "$MYSQL_DATABASE" \
  | gzip > "mystery-box-$(date +%Y%m%d-%H%M%S).sql.gz"
```

Verify:

```bash
gzip -t mystery-box-*.sql.gz
zcat mystery-box-*.sql.gz | head -n 40
```

Store off-box (object storage / encrypted volume). Keep at least one restore-tested copy per release.

## MySQL restore

```bash
# Stop writers (scale app to 0) before restore.
gunzip -c mystery-box-YYYYMMDD-HHMMSS.sql.gz \
  | mysql -h "$MYSQL_HOST" -P "${MYSQL_PORT:-3306}" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD"
```

After restore:

1. Start one app instance; confirm Flyway does **not** attempt unexpected migrations.
2. Spot-check: login, one paid order row, `ops_message_task`, marketplace trades.
3. Re-enable traffic.

**Do not** roll back Flyway versions in production without a written DBA plan (`docs/OPS_RUNBOOK.md`).

## Redis notes

- Redis holds sessions / rate-limit / cache — **not** durable commerce state. Prefer rebuild over restore for most incidents.
- Flush only when intentional (e.g. corrupt cache after bad deploy):

  ```bash
  redis-cli -u "$REDIS_URL" PING
  # redis-cli -u "$REDIS_URL" FLUSHDB   # dangerous — confirm DB index first
  ```

- After Redis loss: users re-login; distributed rate limits reset; idempotency keys for in-flight writes may allow duplicates — watch payment notify idempotency logs.

## PENDING_EXTERNAL (marketplace payout)

When MoMo/ZaloPay marketplace payout stays `PENDING_EXTERNAL`:

1. Admin → ops **marketplace pending external** view (complete or fail + refund).
2. Aged rows auto-fail via `MarketplaceExternalPayoutWatchJob` (`app.marketplace.external-payout-timeout-hours`).
3. Alerts: `infra/prometheus/alerts.yml` PENDING_EXTERNAL rules; see admin hint on that view.

Do not “fix” PENDING_EXTERNAL by DB edit — use admin complete/fail so ledger + refund paths stay consistent.

## Quick recovery order

1. Restore MySQL from last good dump (if data loss).
2. Confirm Redis reachable (fresh empty OK).
3. Deploy last known-good jar; `ProductionSafetyValidator` must pass.
4. Clear PENDING_EXTERNAL backlog via admin.
5. Run one sandbox payment + one warehouse ship smoke.

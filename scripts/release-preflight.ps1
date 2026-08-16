Param(
  [switch]$RunBuild,
  [switch]$RunE2E
)

$ErrorActionPreference = "Stop"

function Write-Check($name, $ok, $detail) {
  if ($ok) {
    Write-Host "[PASS] $name - $detail" -ForegroundColor Green
  } else {
    Write-Host "[FAIL] $name - $detail" -ForegroundColor Red
  }
}

$root = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root "mystery-box-backend"
$admin = Join-Path $root "mystery-box-admin"
$mobile = Join-Path $root "mystery-box-mobile-app"

Write-Host "== Preflight: Mystery Box Commercial Release ==" -ForegroundColor Cyan

# Static checks
$hasReadiness = Test-Path (Join-Path $root "COMMERCIAL_READINESS.md")
Write-Check "Readiness doc exists" $hasReadiness "COMMERCIAL_READINESS.md"

$hasReleaseChecklist = Test-Path (Join-Path $root "RELEASE_CHECKLIST.md")
Write-Check "Release checklist exists" $hasReleaseChecklist "RELEASE_CHECKLIST.md"

$hasOtpConfig = Select-String -Path (Join-Path $backend "src/main/resources/application.yml") -Pattern "admin-action-otp" -SimpleMatch -ErrorAction SilentlyContinue
Write-Check "Admin OTP configured key" ($null -ne $hasOtpConfig) "security.admin-action-otp key present"

$hasShedLock = Select-String -Path (Join-Path $backend "pom.xml") -Pattern "shedlock" -SimpleMatch -ErrorAction SilentlyContinue
Write-Check "ShedLock dependency" ($null -ne $hasShedLock) "shedlock in pom.xml for multi-instance jobs"

$hasRedisRateLimit = Test-Path (Join-Path $backend "src/main/java/io/github/qifan777/server/infrastructure/config/ApiRateLimitFilter.java")
Write-Check "Redis rate limit filter" $hasRedisRateLimit "ApiRateLimitFilter.java"

$hasIdempotency = Test-Path (Join-Path $backend "src/main/java/io/github/qifan777/server/infrastructure/config/IdempotencyKeyFilter.java")
Write-Check "Redis idempotency filter" $hasIdempotency "IdempotencyKeyFilter.java"

$hasAuditTable = Select-String -Path (Join-Path $root "database.sql") -Pattern "mystery_box_win_rule_op_log" -SimpleMatch -ErrorAction SilentlyContinue
Write-Check "Audit table schema" ($null -ne $hasAuditTable) "mystery_box_win_rule_op_log in database.sql"

$hasApproveApi = Select-String -Path (Join-Path $backend "src/main/java/io/github/qifan777/server/box/win/controller/MysteryBoxWinRuleForAdminController.java") -Pattern "approve" -SimpleMatch -ErrorAction SilentlyContinue
Write-Check "Approval API exists" ($null -ne $hasApproveApi) "approve endpoint found"

$hasSoundEngine = Test-Path (Join-Path $mobile "src/effects/sound.ts")
Write-Check "Mobile sound engine exists" $hasSoundEngine "src/effects/sound.ts"

$maestroFlows = @(Get-ChildItem -Path (Join-Path $mobile ".maestro/flows") -Filter "*.yaml" -ErrorAction SilentlyContinue)
Write-Check "Maestro flow inventory" ($maestroFlows.Count -ge 25) "$($maestroFlows.Count) flows (need >= 25)"

$hasQueryPersist = Test-Path (Join-Path $mobile "src/query/queryPersist.tsx")
Write-Check "React Query offline persist" $hasQueryPersist "queryPersist.tsx wired"

$hasOfflineQueue = Test-Path (Join-Path $mobile "src/offline/offlineMutationQueue.ts")
Write-Check "Offline mutation queue" $hasOfflineQueue "offlineMutationQueue.ts"

$flywayOrderId = @(
  "V20260550_01__order_id_legacy_compat.sql",
  "V20260551_01__order_id_migration_menu.sql",
  "V20260551_02__warehouse_list_indexes.sql",
  "V20260552_01__order_id_migration_log.sql"
) | ForEach-Object { Test-Path (Join-Path $backend "src/main/resources/db/migration/$_") }
Write-Check "Order ID Flyway migrations" (($flywayOrderId | Where-Object { $_ }).Count -eq 4) "4 migration scripts present"

$hasEasJson = Test-Path (Join-Path $mobile "eas.json")
Write-Check "EAS build config" $hasEasJson "mystery-box-mobile-app/eas.json"

$hasStagingMigrationScript = Test-Path (Join-Path $backend "scripts/staging-order-id-migration.ps1")
Write-Check "Staging migration script" $hasStagingMigrationScript "scripts/staging-order-id-migration.ps1"

$hasWarehouseMetrics = Test-Path (Join-Path $backend "src/main/java/io/github/qifan777/server/warehouse/metrics/WarehouseMetrics.java")
Write-Check "Warehouse fallback metrics" $hasWarehouseMetrics "WarehouseMetrics.java"

$hasTestApplicationYml = Test-Path (Join-Path $backend "src/test/resources/application.yml")
Write-Check "SpringBootTest profile defaults" $hasTestApplicationYml "src/test/resources/application.yml (mock pay + draw redis off)"

$hasOrderIdMigrationE2e = Select-String -Path (Join-Path $admin "tests/e2e/smoke.spec.js") -Pattern "order-id-migration" -SimpleMatch -ErrorAction SilentlyContinue
Write-Check "Admin order-id-migration e2e" ($null -ne $hasOrderIdMigrationE2e) "smoke.spec.js covers /order-id-migration"

$hasWarehouseShipE2e = Select-String -Path (Join-Path $admin "tests/e2e/smoke.spec.js") -Pattern "warehouse-ship-request" -SimpleMatch -ErrorAction SilentlyContinue
Write-Check "Admin warehouse-ship e2e" ($null -ne $hasWarehouseShipE2e) "smoke.spec.js covers /warehouse-ship-request"

$hasMetricsAlertsDoc = Test-Path (Join-Path $root "docs/METRICS_ALERTS.md")
Write-Check "Metrics alerts doc" $hasMetricsAlertsDoc "docs/METRICS_ALERTS.md"

$hasPrometheusAlerts = Test-Path (Join-Path $root "infra/prometheus/alerts.yml")
Write-Check "Prometheus alerts manifest" $hasPrometheusAlerts "infra/prometheus/alerts.yml"

$hasGrafanaDashboard = Test-Path (Join-Path $root "infra/grafana/dashboard-mystery-box.json")
Write-Check "Grafana ops dashboard" $hasGrafanaDashboard "infra/grafana/dashboard-mystery-box.json"

$hasOpsRunbook = Test-Path (Join-Path $root "docs/OPS_RUNBOOK.md")
Write-Check "Ops runbook" $hasOpsRunbook "docs/OPS_RUNBOOK.md"

$hasVnLaunchRunbook = Test-Path (Join-Path $root "docs/VN_LAUNCH_RUNBOOK.md")
Write-Check "VN launch runbook" $hasVnLaunchRunbook "docs/VN_LAUNCH_RUNBOOK.md"

$hasStagingSoakDoc = Test-Path (Join-Path $root "docs/STAGING_SOAK.md")
Write-Check "Staging soak doc" $hasStagingSoakDoc "docs/STAGING_SOAK.md"

$hasStagingSoakScript = (Test-Path (Join-Path $root "scripts/staging-soak.ps1")) -and (Test-Path (Join-Path $root "scripts/staging-soak.sh"))
Write-Check "Staging soak scripts" $hasStagingSoakScript "scripts/staging-soak.ps1 + .sh"

$hasWipeHardeningDoc = Test-Path (Join-Path $root "docs/WIPE_RESIDUAL_HARDENING.md")
Write-Check "Wipe residual hardening doc" $hasWipeHardeningDoc "docs/WIPE_RESIDUAL_HARDENING.md"

$dictJavaTopLevel = Select-String -Path (Join-Path $backend "src/main/resources/templates/dict-java.ftl") -Pattern "public enum" -SimpleMatch -ErrorAction SilentlyContinue
Write-Check "Dict Freemarker no nested enums" ($null -eq $dictJavaTopLevel) "dict-java.ftl constants-only"

$hasDictEnumFtl = Test-Path (Join-Path $backend "src/main/resources/templates/dict-enum.ftl")
Write-Check "Dict enum Freemarker" $hasDictEnumFtl "dict-enum.ftl"

$userPasswordStrip = Select-String -Path (Join-Path $backend "src/main/java/io/github/qifan777/server/user/root/repository/UserRepository.java") -Pattern "password\(false\)" -ErrorAction SilentlyContinue
Write-Check "User fetcher strips password" ($null -ne $userPasswordStrip) "COMPLEX_FETCHER password(false)"

$prodActiveTimeout = Select-String -Path (Join-Path $backend "src/main/resources/application-prod.yml") -Pattern "active-timeout" -SimpleMatch -ErrorAction SilentlyContinue
Write-Check "Prod Sa-Token active-timeout" ($null -ne $prodActiveTimeout) "application-prod.yml"

$hasVnPrivateExample = Test-Path (Join-Path $backend "src/main/resources/application-private.vn.example.yml")
Write-Check "VN private config example" $hasVnPrivateExample "application-private.vn.example.yml"

if (-not $RunBuild -and -not $RunE2E) {
  Write-Host "`nBuild checks skipped. Use -RunBuild to execute compile/build commands." -ForegroundColor Yellow
  Write-Host "Staging manual checks: OTP rotation, WeChat/VNPay callback URL, Sentry/alerts, reveal QA on 2+ devices." -ForegroundColor Yellow
  Write-Host "Use -RunE2E for Admin Playwright smoke and Maestro flow inventory." -ForegroundColor Yellow
  exit 0
}

if ($RunE2E) {
  Push-Location $admin
  try {
    npm run e2e:smoke 2>&1 | Out-Host
    Write-Check "Admin Playwright smoke" $true "npm run e2e:smoke"
  } catch {
    Write-Check "Admin Playwright smoke" $false $_.Exception.Message
  }
  Pop-Location

  $maestroScript = Join-Path $root "scripts/maestro-ci-smoke.sh"
  if (Test-Path $maestroScript) {
    $bash = Get-Command bash -ErrorAction SilentlyContinue
    if ($null -ne $bash) {
      try {
        & bash $maestroScript 2>&1 | Out-Host
        Write-Check "Maestro CI smoke inventory" $true "scripts/maestro-ci-smoke.sh"
      } catch {
        Write-Check "Maestro CI smoke inventory" $false $_.Exception.Message
      }
    } else {
      Write-Check "Maestro CI smoke inventory" $false "bash not found; run scripts/maestro-ci-smoke.sh manually"
    }
  } else {
    Write-Check "Maestro CI smoke script" $false "scripts/maestro-ci-smoke.sh missing"
  }

  if (-not $RunBuild) {
    exit 0
  }
}

# Build checks
Push-Location $backend
try {
  mvn test | Out-Host
  Write-Check "Backend unit + integration tests" $true "mvn test"
} catch {
  Write-Check "Backend unit + integration tests" $false $_.Exception.Message
}
Pop-Location

Push-Location $admin
try {
  npm run build | Out-Host
  Write-Check "Admin build" $true "npm run build"
} catch {
  Write-Check "Admin build" $false $_.Exception.Message
}
Pop-Location

Push-Location $mobile
try {
  npm run check | Out-Host
  Write-Check "Mobile test + typecheck" $true "npm run check"
} catch {
  Write-Check "Mobile test + typecheck" $false $_.Exception.Message
}
Pop-Location

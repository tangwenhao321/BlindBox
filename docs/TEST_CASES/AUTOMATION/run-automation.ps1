# Batch-run automatable suites and write a regression report.
# Usage: pwsh docs/TEST_CASES/AUTOMATION/run-automation.ps1

$ErrorActionPreference = "Continue"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$ReportDir = Join-Path $PSScriptRoot "reports"
New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$Report = Join-Path $ReportDir "automation-run-$Stamp.md"

function Write-Report([string]$line) {
  Add-Content -Path $Report -Value $line -Encoding UTF8
  Write-Host $line
}

Write-Report "# Automation batch run"
Write-Report ""
Write-Report "- time: $(Get-Date -Format o)"
Write-Report "- root: $Root"
Write-Report ""

$failed = 0

Write-Report "## 1. Classify + execute ALL catalog cases"
Push-Location (Join-Path $Root "docs\TEST_CASES\AUTOMATION")
node ".\classify-cases.js" 2>&1 | Out-Null
node ".\execute-all-cases.js" 2>&1 | Tee-Object -Variable execOut | Out-Null
$execExit = $LASTEXITCODE
Write-Report "execute-all exit=$execExit"
Write-Report '```'
Write-Report ($execOut -join "`n")
Write-Report '```'
if ($execExit -ne 0) { $failed++ }
Pop-Location

Write-Report ""
Write-Report "## 2. Mobile Vitest (policy + full catalog gate)"
Push-Location (Join-Path $Root "mystery-box-mobile-app")
npm test -- --run src/test/fullCatalogAutomation.test.ts src/effects/revealSkipPolicy.automation.test.ts src/utils/marketplaceProceeds.automation.test.ts src/utils/journeyScenarioAutomation.test.ts 2>&1 | Tee-Object -Variable mobileOut | Out-Null
$mobileExit = $LASTEXITCODE
Write-Report "exit=$mobileExit"
Write-Report '```'
Write-Report (($mobileOut | Select-Object -Last 40) -join "`n")
Write-Report '```'
if ($mobileExit -ne 0) { $failed++ }
Pop-Location

Write-Report ""
Write-Report "## 3. Backend Maven (focused money/marketplace)"
Push-Location (Join-Path $Root "mystery-box-backend")
mvn -q "-Dtest=MarketplaceServiceTest,MysteryBoxOrderServicePaymentNotifyTest,MysteryBoxOrderServiceRefundTest,BoxExpectedValueGuardTest,UserWalletServiceTest,MoneyRoundingTest,RefundRecordServiceTest,OrderDrawIntegrityServiceTest" test 2>&1 | Tee-Object -Variable mvnOut | Out-Null
$mvnExit = $LASTEXITCODE
Write-Report "exit=$mvnExit"
Write-Report '```'
Write-Report (($mvnOut | Select-Object -Last 40) -join "`n")
Write-Report '```'
if ($mvnExit -ne 0) { $failed++ }
Pop-Location

Write-Report ""
Write-Report "## 4. Maestro validate"
Push-Location (Join-Path $Root "mystery-box-mobile-app")
npm run validate:maestro 2>&1 | Tee-Object -Variable maestroOut | Out-Null
$maestroExit = $LASTEXITCODE
Write-Report "exit=$maestroExit"
Write-Report (($maestroOut | Select-Object -Last 20) -join "`n")
if ($maestroExit -ne 0) { $failed++ }
Pop-Location

Write-Report ""
Write-Report "## 5. Admin Vitest"
Push-Location (Join-Path $Root "mystery-box-admin")
npm test -- --run 2>&1 | Tee-Object -Variable adminOut | Out-Null
$adminExit = $LASTEXITCODE
Write-Report "exit=$adminExit"
Write-Report (($adminOut | Select-Object -Last 20) -join "`n")
if ($adminExit -ne 0) { $failed++ }
Pop-Location

Write-Report ""
Write-Report "## Summary"
if ($failed -eq 0) { Write-Report "**PASS** all automation gates." } else { Write-Report "**FAIL** $failed suite(s)." }
Write-Report "Full catalog report: docs/TEST_CASES/AUTOMATION/FULL_EXECUTION_REPORT.md"
Write-Host "Report: $Report"
exit $failed

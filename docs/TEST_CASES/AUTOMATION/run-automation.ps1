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

# 1) Classify catalog
Write-Report "## 1. Classify cases"
Push-Location (Join-Path $Root "docs\TEST_CASES\AUTOMATION")
node ".\classify-cases.js" | Tee-Object -Variable classifyOut | Out-Null
Write-Report '```'
Write-Report ($classifyOut -join "`n")
Write-Report '```'
Pop-Location

$failed = 0

# 2) Mobile vitest (effects + journey automation)
Write-Report ""
Write-Report "## 2. Mobile Vitest"
Push-Location (Join-Path $Root "mystery-box-mobile-app")
npm test -- --run src/effects/revealSkipPolicy.automation.test.ts src/effects/revealSkipPolicy.test.ts src/utils/marketplaceProceeds.automation.test.ts src/utils/journeyScenarioAutomation.test.ts 2>&1 | Tee-Object -Variable mobileOut | Out-Null
$mobileExit = $LASTEXITCODE
Write-Report "exit=$mobileExit"
Write-Report '```'
Write-Report (($mobileOut | Select-Object -Last 40) -join "`n")
Write-Report '```'
if ($mobileExit -ne 0) { $failed++ }
Pop-Location

# 3) Backend focused money/marketplace tests
Write-Report ""
Write-Report "## 3. Backend Maven (focused)"
Push-Location (Join-Path $Root "mystery-box-backend")
mvn -q "-Dtest=MarketplaceServiceTest,MysteryBoxOrderServicePaymentNotifyTest,MysteryBoxOrderServiceRefundTest,BoxExpectedValueGuardTest,UserWalletServiceTest,MoneyRoundingTest,RefundRecordServiceTest,OrderDrawIntegrityServiceTest" test 2>&1 | Tee-Object -Variable mvnOut | Out-Null
$mvnExit = $LASTEXITCODE
Write-Report "exit=$mvnExit"
Write-Report '```'
Write-Report (($mvnOut | Select-Object -Last 50) -join "`n")
Write-Report '```'
if ($mvnExit -ne 0) { $failed++ }
Pop-Location

# 4) Maestro validate (no device)
Write-Report ""
Write-Report "## 4. Maestro flow validate"
Push-Location (Join-Path $Root "mystery-box-mobile-app")
npm run validate:maestro 2>&1 | Tee-Object -Variable maestroOut | Out-Null
$maestroExit = $LASTEXITCODE
Write-Report "exit=$maestroExit"
Write-Report '```'
Write-Report (($maestroOut | Select-Object -Last 30) -join "`n")
Write-Report '```'
if ($maestroExit -ne 0) { $failed++ }
Pop-Location

# 5) Admin vitest if present
Write-Report ""
Write-Report "## 5. Admin Vitest"
Push-Location (Join-Path $Root "mystery-box-admin")
npm test -- --run 2>&1 | Tee-Object -Variable adminOut | Out-Null
$adminExit = $LASTEXITCODE
Write-Report "exit=$adminExit"
Write-Report '```'
Write-Report (($adminOut | Select-Object -Last 30) -join "`n")
Write-Report '```'
if ($adminExit -ne 0) { $failed++ }
Pop-Location

Write-Report ""
Write-Report "## Summary"
if ($failed -eq 0) {
  Write-Report "**PASS** all automation gates."
} else {
  Write-Report "**FAIL** $failed suite(s). See sections above."
}
Write-Report ""
Write-Report "Manual residual list: ``docs/TEST_CASES/AUTOMATION/MANUAL_CASES.md``"

Write-Host ""
Write-Host "Report: $Report"
exit $failed

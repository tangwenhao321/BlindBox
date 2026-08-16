Param(
  [string]$BaseUrl = $env:STAGING_BASE_URL,
  [switch]$SkipActuator
)

$ErrorActionPreference = "Stop"

function Probe([string]$Name, [string]$Url, [scriptblock]$Assert) {
  try {
    $resp = Invoke-WebRequest -Uri $Url -Method GET -UseBasicParsing -TimeoutSec 20
    & $Assert $resp
    Write-Host "[PASS] $Name ($($resp.StatusCode)) $Url" -ForegroundColor Green
    return $true
  } catch {
    Write-Host "[FAIL] $Name - $($_.Exception.Message)" -ForegroundColor Red
    return $false
  }
}

if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
  Write-Host "STAGING_BASE_URL not set. Static soak doc check only." -ForegroundColor Yellow
  $doc = Join-Path (Split-Path -Parent $PSScriptRoot) "docs\STAGING_SOAK.md"
  if (-not (Test-Path $doc)) { Write-Host "[FAIL] missing docs/STAGING_SOAK.md"; exit 1 }
  Write-Host "[PASS] docs/STAGING_SOAK.md present" -ForegroundColor Green
  Write-Host "Set STAGING_BASE_URL to run live probes." -ForegroundColor Yellow
  exit 0
}

$BaseUrl = $BaseUrl.TrimEnd("/")
$fail = 0

Write-Host "== Staging soak probe: $BaseUrl ==" -ForegroundColor Cyan

if (-not $SkipActuator) {
  $ok = Probe "actuator health" "$BaseUrl/actuator/health" {
    param($r)
    if ($r.StatusCode -ne 200) { throw "status $($r.StatusCode)" }
  }
  if (-not $ok) { $fail++ }
}

$ok = Probe "front app config" "$BaseUrl/front/app/config" {
  param($r)
  if ($r.StatusCode -ne 200) { throw "status $($r.StatusCode)" }
  $body = $r.Content
  if ($body -notmatch "currency|paymentProvider|momoEnabled|featureFlags") {
    throw "unexpected config payload"
  }
}
if (-not $ok) { $fail++ }

$ok = Probe "momo status" "$BaseUrl/front/payment/momo/status" {
  param($r)
  if ($r.StatusCode -ne 200) { throw "status $($r.StatusCode)" }
}
if (-not $ok) { $fail++ }

Write-Host ""
Write-Host "Manual next: VNPay IPN + SSE with token — see docs/STAGING_SOAK.md" -ForegroundColor Yellow
if ($fail -gt 0) { exit 1 }
Write-Host "Probe OK ($fail failures)" -ForegroundColor Green
exit 0

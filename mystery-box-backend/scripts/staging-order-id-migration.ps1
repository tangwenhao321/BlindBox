# Staging helper for order ID migration (Admin API).
# Usage:
#   $env:ADMIN_TOKEN = "<satoken from admin login>"
#   .\scripts\staging-order-id-migration.ps1 -Step audit
#   .\scripts\staging-order-id-migration.ps1 -Step prepare -BatchSize 50
#   .\scripts\staging-order-id-migration.ps1 -Step dry-run -BatchSize 10
#   .\scripts\staging-order-id-migration.ps1 -Step apply-one -LegacyId "<uuid>"
#   .\scripts\staging-order-id-migration.ps1 -Step apply-batch -BatchSize 10
#
# Prerequisite Flyway (auto on boot): V20260550_01, V20260551_01, V20260551_02, V20260552_01
# Always backup staging DB before Step 2 rewrite.

param(
    [ValidateSet("audit", "pending", "prepare", "dry-run", "apply-one", "apply-batch", "log", "preflight")]
    [string]$Step = "audit",
    [string]$BaseUrl = "http://127.0.0.1:9912",
    [string]$Token = $env:ADMIN_TOKEN,
    [int]$BatchSize = 20,
    [string]$LegacyId = ""
)

$ErrorActionPreference = "Stop"
$ConfirmToken = "REWRITE_ORDER_IDS"

function Invoke-MigrationApi {
    param(
        [string]$Method,
        [string]$Path,
        [hashtable]$Query = @{},
        $Body = $null
    )
    if (-not $Token) {
        throw "Set ADMIN_TOKEN env var or pass -Token (Admin satoken header value)."
    }
    $uri = "$BaseUrl/admin/order-id-migration$Path"
    if ($Query.Count -gt 0) {
        $qs = ($Query.GetEnumerator() | ForEach-Object { "{0}={1}" -f [uri]::EscapeDataString($_.Key), [uri]::EscapeDataString([string]$_.Value) }) -join "&"
        $uri = "$uri?$qs"
    }
    $headers = @{ token = $Token }
    if ($Body -ne $null) {
        return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers -ContentType "application/json" -Body ($Body | ConvertTo-Json)
    }
    return Invoke-RestMethod -Method $Method -Uri $uri -Headers $headers
}

Write-Host "== Order ID migration ($Step) => $BaseUrl ==" -ForegroundColor Cyan

switch ($Step) {
    "audit" {
        $res = Invoke-MigrationApi -Method GET -Path "/audit" -Query @{ sampleSize = 10 }
        $res | ConvertTo-Json -Depth 6
    }
    "pending" {
        $res = Invoke-MigrationApi -Method GET -Path "/pending" -Query @{ limit = $BatchSize }
        $res | ConvertTo-Json -Depth 4
    }
    "prepare" {
        $res = Invoke-MigrationApi -Method POST -Path "/prepare-mappings" -Query @{ batchSize = $BatchSize }
        Write-Host "Created mappings: $($res.created)" -ForegroundColor Green
    }
    "dry-run" {
        $res = Invoke-MigrationApi -Method GET -Path "/rewrite/dry-run" -Query @{ batchSize = $BatchSize }
        $res | ConvertTo-Json -Depth 6
        Write-Host "Dry-run plans: $($res.Count)" -ForegroundColor Yellow
    }
    "apply-one" {
        if (-not $LegacyId) { throw "apply-one requires -LegacyId" }
        Write-Host "Applying rewrite for $LegacyId (confirm=$ConfirmToken)" -ForegroundColor Red
        $res = Invoke-MigrationApi -Method POST -Path "/rewrite/$([uri]::EscapeDataString($LegacyId))" -Query @{ confirm = $ConfirmToken }
        $res | ConvertTo-Json -Depth 4
    }
    "apply-batch" {
        Write-Host "Applying batch rewrite (batchSize=$BatchSize, confirm=$ConfirmToken)" -ForegroundColor Red
        $res = Invoke-MigrationApi -Method POST -Path "/rewrite/batch" -Query @{ batchSize = $BatchSize; confirm = $ConfirmToken }
        Write-Host "Batch results: $($res.Count)" -ForegroundColor Green
        $res | ConvertTo-Json -Depth 4
    }
    "log" {
        $res = Invoke-MigrationApi -Method GET -Path "/rewrite/log" -Query @{ limit = $BatchSize }
        $res | ConvertTo-Json -Depth 4
    }
    "preflight" {
        $res = Invoke-MigrationApi -Method GET -Path "/preflight"
        $res | ConvertTo-Json -Depth 4
        if ($res.ready) {
            Write-Host "Preflight OK — schema ready for migration." -ForegroundColor Green
        } else {
            Write-Host "Preflight FAILED — missing:" -ForegroundColor Red
            $res.missingObjects | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
        }
    }
}

Write-Host "Done." -ForegroundColor Green

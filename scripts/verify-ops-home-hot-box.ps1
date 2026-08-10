# Verify admin ops-home-hot-box API (backend on 9912, admin login)
param(
    [string]$BaseUrl = "http://127.0.0.1:9912",
    [string]$Phone = "admin",
    [string]$Password = "Admin@123456"
)

$ErrorActionPreference = "Stop"

$loginBody = @{ phone = $Phone; password = $Password } | ConvertTo-Json -Compress
$login = Invoke-RestMethod -Uri "$BaseUrl/admin/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
if ($login.code -and $login.code -ne 1) {
    Write-Error "Login failed: $($login.msg)"
}
$token = $login.result.tokenValue
$headers = @{ token = $token; "Content-Type" = "application/json" }

$listResp = Invoke-RestMethod -Uri "$BaseUrl/admin/ops-home-hot-box" -Method Get -Headers $headers
$list = if ($listResp.result) { $listResp.result } else { $listResp }
Write-Host "Hot box rows: $($list.Count)"

$boxes = Invoke-RestMethod -Uri "$BaseUrl/admin/mystery-box/query" -Method Post -Headers $headers -Body (@{
    pageNum = 1; pageSize = 1; query = @{}
} | ConvertTo-Json -Compress)
$boxId = $boxes.result.content[0].id
if (-not $boxId) { Write-Error "No mystery box found" }

$saveBody = @{
    mysteryBoxId = $boxId
    enabled = $true
    sortOrder = 1
} | ConvertTo-Json -Compress
$saveResp = Invoke-RestMethod -Uri "$BaseUrl/admin/ops-home-hot-box/save" -Method Post -Headers $headers -Body $saveBody
$savedId = if ($saveResp.result) { $saveResp.result } else { $saveResp }
Write-Host "Saved id=$savedId"

$summary = Invoke-RestMethod -Uri "$BaseUrl/front/home/summary" -Method Get
$hotIds = @($summary.result.hotBoxes | ForEach-Object { $_.id })
Write-Host "Front hotBoxes count: $($hotIds.Count), includes saved box: $($hotIds -contains $boxId)"

Invoke-RestMethod -Uri "$BaseUrl/admin/ops-home-hot-box/$savedId/enabled?enabled=false" -Method Post -Headers $headers | Out-Null
$summaryOff = Invoke-RestMethod -Uri "$BaseUrl/front/home/summary" -Method Get
$hotIdsOff = @($summaryOff.result.hotBoxes | ForEach-Object { $_.id })
if ($hotIdsOff -contains $boxId) { Write-Error "Disabled hot box still in front summary" }
Write-Host "After disable: box not in front summary (OK)"

Invoke-RestMethod -Uri "$BaseUrl/admin/ops-home-hot-box/$savedId/enabled?enabled=true" -Method Post -Headers $headers | Out-Null
$summaryOn = Invoke-RestMethod -Uri "$BaseUrl/front/home/summary" -Method Get
$hotIdsOn = @($summaryOn.result.hotBoxes | ForEach-Object { $_.id })
if ($hotIdsOn -notcontains $boxId) { Write-Error "Re-enabled hot box missing from front summary" }
Write-Host "After re-enable: box back in front summary (OK)"

# OSS upload smoke
$png = Join-Path $env:TEMP "verify-oss.png"
[IO.File]::WriteAllBytes($png, [byte[]](0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A,0x00,0x00,0x00,0x0D,0x49,0x48,0x44,0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,0x08,0x06,0x00,0x00,0x00,0x1F,0x15,0xC4,0x89,0x00,0x00,0x00,0x0A,0x49,0x44,0x41,0x54,0x78,0x9C,0x63,0x00,0x01,0x00,0x00,0x05,0x00,0x01,0x0D,0x0A,0x2D,0xB4,0x00,0x00,0x00,0x00,0x49,0x45,0x4E,0x44,0xAE,0x42,0x60,0x82))
$uploadJson = curl.exe -s -X POST "$BaseUrl/oss/upload" -H "token: $token" -F "file=@$png"
if ($uploadJson -notmatch '"/uploads/') { Write-Error "OSS upload failed: $uploadJson" }
Write-Host "OSS upload OK"

Invoke-RestMethod -Uri "$BaseUrl/admin/ops-home-hot-box/$savedId" -Method Delete -Headers $headers | Out-Null
Write-Host "Deleted test row $savedId"
Write-Host "OK"

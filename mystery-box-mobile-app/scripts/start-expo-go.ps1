# 在独立终端中启动 Expo，显示 Expo Go 扫码二维码（Cursor 后台终端不会显示二维码）
$Root = Split-Path $PSScriptRoot -Parent
$Title = "Expo Go - 扫码连接"

$lanIp = (
  Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -match '^192\.168\.\d+\.\d+$' -and $_.IPAddress -notlike '192.168.64.*' } |
  Select-Object -First 1
).IPAddress

if (-not $lanIp) {
  $lanIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' } | Select-Object -First 1).IPAddress
}

Write-Host "正在新窗口启动 Expo（标题: $Title）..."
Write-Host "若未弹出二维码，可在 Expo Go 中手动输入: exp://${lanIp}:8083"
Write-Host "或在浏览器打开: http://localhost:8083"

Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "Set-Location '$Root'; `$host.UI.RawUI.WindowTitle='$Title'; npm run start:go"
)

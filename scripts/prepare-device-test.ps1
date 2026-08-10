# Prepare Android physical-device testing for mystery-box.
# Run from mystery-box-main:
#   powershell -ExecutionPolicy Bypass -File scripts/prepare-device-test.ps1
#
# Optional flags:
#   -SkipMaestro    Skip Maestro install
#   -SkipRedis      Skip Redis start
#   -SkipStart      Do not launch backend / Metro
#   -BuildApp       Run expo prebuild + install dev build to connected device

param(
  [switch]$SkipMaestro,
  [switch]$SkipRedis,
  [switch]$SkipStart,
  [switch]$BuildApp
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$mobile = Join-Path $root "mystery-box-mobile-app"
$scripts = Join-Path $root "scripts"

function Get-LanIPv4 {
  $addr = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' -and $_.InterfaceAlias -notmatch 'vEthernet|WSL|Docker|Loopback' } |
    Select-Object -First 1 -ExpandProperty IPAddress
  if ($addr) { return $addr }
  return "192.168.1.100"
}

function Test-PortOpen([int]$port) {
  try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect("127.0.0.1", $port)
    $tcp.Close()
    return $true
  } catch { return $false }
}

function Write-Step([string]$msg) { Write-Host "`n== $msg ==" -ForegroundColor Cyan }

Write-Host ""
Write-Host "  Mystery Box - Android device test prep" -ForegroundColor Green
Write-Host "  Install dir: D:\软件安装"
Write-Host ""

# --- 1. Prerequisites ---
Write-Step "检查基础工具"
$checks = @(
  @{ Name = "Java 17+"; Cmd = { java -version 2>&1 | Out-Null; $LASTEXITCODE -eq 0 -or $? } },
  @{ Name = "Node.js"; Cmd = { Get-Command node -ErrorAction Stop | Out-Null; $true } },
  @{ Name = "adb"; Cmd = { Get-Command adb -ErrorAction Stop | Out-Null; $true } },
  @{ Name = "Maven"; Cmd = { Get-Command mvn -ErrorAction Stop | Out-Null; $true } }
)
foreach ($c in $checks) {
  try {
    $ok = & $c.Cmd
    if ($ok) { Write-Host "  [OK] $($c.Name)" -ForegroundColor Green }
    else { Write-Host "  [!!] $($c.Name) missing" -ForegroundColor Yellow }
  } catch {
    Write-Host "  [!!] $($c.Name) missing" -ForegroundColor Yellow
  }
}

if (-not $env:ANDROID_HOME) {
  $cSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
  $dSdk = "D:\软件安装\Android\Sdk"
  if (Test-Path $cSdk) { $env:ANDROID_HOME = $cSdk }
  elseif (Test-Path $dSdk) { $env:ANDROID_HOME = $dSdk }
}
Write-Host "  ANDROID_HOME = $($env:ANDROID_HOME)"

# --- 2. Maestro (optional E2E) ---
if (-not $SkipMaestro) {
  Write-Step "Maestro CLI (E2E 自动化，可选)"
  $maestroBat = "D:\软件安装\Maestro\maestro\bin\maestro.bat"
  if (-not (Get-Command maestro -ErrorAction SilentlyContinue) -and -not (Test-Path $maestroBat)) {
    & (Join-Path $scripts "setup-maestro.ps1")
  } elseif (Test-Path $maestroBat) {
    $env:Path = "$(Split-Path $maestroBat);$env:Path"
  }
  if (Get-Command maestro -ErrorAction SilentlyContinue) {
    maestro --version
  } else {
    Write-Host "  Maestro not on PATH yet - restart terminal after install." -ForegroundColor Yellow
  }
}

# --- 3. Redis ---
if (-not $SkipRedis) {
  Write-Step "Redis (6380，与 dev 配置一致)"
  if (-not (Test-PortOpen 6380)) {
    & (Join-Path $scripts "setup-redis-local.ps1")
  } else {
    Write-Host "  [OK] Redis already on 6380"
  }
  $env:REDIS_URL = "redis://127.0.0.1:6380/0"
}

# --- 4. .env for physical device ---
Write-Step "配置 App .env（局域网 IP）"
$lanIp = Get-LanIPv4
$envFile = Join-Path $mobile ".env"
$envExample = Join-Path $mobile ".env.example"
$apiUrl = "http://${lanIp}:9912"

if (-not (Test-Path $envFile)) {
  Copy-Item $envExample $envFile
}
$content = Get-Content $envFile -Raw
if ($content -match 'EXPO_PUBLIC_API_BASE_URL=') {
  $content = $content -replace 'EXPO_PUBLIC_API_BASE_URL=.*', "EXPO_PUBLIC_API_BASE_URL=$apiUrl"
} else {
  $content = "EXPO_PUBLIC_API_BASE_URL=$apiUrl`n$content"
}
if ($content -notmatch 'MAESTRO_TEST_PHONE=') {
  $content += "`nMAESTRO_TEST_PHONE=13800138000`nMAESTRO_TEST_PASSWORD=Admin@123456`n"
}
if ($content -notmatch 'EXPO_PUBLIC_MOCK_PAYMENT=') {
  $content += "EXPO_PUBLIC_MOCK_PAYMENT=true`n"
}
Set-Content -Path $envFile -Value $content.TrimEnd() -Encoding UTF8
Write-Host "  EXPO_PUBLIC_API_BASE_URL=$apiUrl"

# --- 5. npm deps ---
Write-Step "移动端依赖"
Push-Location $mobile
if (-not (Test-Path "node_modules")) {
  npm ci
}
Pop-Location

# --- 6. adb device ---
Write-Step "连接 Android 真机"
Write-Host "  1. 开发者选项 -> USB 调试"
Write-Host "  2. USB 连电脑，允许调试"
Write-Host "  3. 手机与电脑同一 Wi-Fi"
Write-Host ""
adb devices -l
$devices = (adb devices | Select-String "device$" | Measure-Object).Count
if ($devices -eq 0) {
  Write-Host "  [!!] 未检测到已授权设备。插线并重试 adb devices" -ForegroundColor Yellow
}

# --- 7. Start stack ---
if (-not $SkipStart) {
  Write-Step "启动后端 + Metro"
  if (-not (Test-PortOpen 3306)) {
    Write-Host "  [!!] MySQL 3306 未监听。请启动 MySQL 或 Docker Desktop 后执行:" -ForegroundColor Yellow
    Write-Host "      docker compose -f docker-compose.local.yml up -d" -ForegroundColor Yellow
  }
  $env:REDIS_URL = if ($env:REDIS_URL) { $env:REDIS_URL } else { "redis://127.0.0.1:6380/0" }
  $env:DEV_DB_PASSWORD = if ($env:DEV_DB_PASSWORD) { $env:DEV_DB_PASSWORD } else { "Admin123#" }
  & (Join-Path $scripts "start-local.ps1")
}

# --- 8. Optional build ---
if ($BuildApp) {
  Write-Step "编译并安装 Dev Client 到真机"
  Push-Location $mobile
  if (-not (Test-Path "android\app\build.gradle")) {
    npm run prebuild
  }
  npx expo run:android --device
  Pop-Location
}

Write-Step "下一步"
Write-Host "  1. adb devices 应显示 device"
Write-Host "  2. cd mystery-box-mobile-app && npm run android"
Write-Host "  3. 已装 App 后: npx expo start --dev-client --port 8083 --lan"
Write-Host "  4. Maestro: maestro test .maestro/flows/smoke.yaml"
Write-Host "  文档: docs/NATIVE_BUILD.md"

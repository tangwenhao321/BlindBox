# 测试环境部署脚本（Windows PowerShell）
# 用法:
#   .\scripts\deploy-test.ps1                    # 启动依赖 + 后端 + 管理端
#   .\scripts\deploy-test.ps1 -BackendOnly       # 仅后端
#   .\scripts\deploy-test.ps1 -BuildApk          # 额外打测试 APK
#   .\scripts\deploy-test.ps1 -Stop              # 停止测试环境进程
#   .\scripts\deploy-test.ps1 -ResetDb           # 清空测试库（危险，仅测试环境）

param(
    [switch]$BackendOnly,
    [switch]$AdminOnly,
    [switch]$BuildApk,
    [switch]$Stop,
    [switch]$ResetDb,
    [switch]$ServerApi
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $Root "mystery-box-backend"
$AdminDir = Join-Path $Root "mystery-box-admin"
$MobileDir = Join-Path $Root "mystery-box-mobile-app"
$ComposeFile = Join-Path $Root "docker-compose.test.yml"
$PrivateTestYml = Join-Path $BackendDir "src\main\resources\application-private-test.yml"
$PrivateTestExample = Join-Path $BackendDir "src\main\resources\application-private.test.example.yml"

$TestApiPort = 9913
$TestAdminPort = 5178
$TestMySqlPort = 3307
$TestRedisPort = 6381

function Test-PortListen([int]$Port) {
    $c = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    return $null -ne $c
}

function Stop-Port([int]$Port) {
    $c = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($c) {
        Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
}

function Wait-HttpOk([string]$Url, [int]$MaxSeconds = 180) {
    for ($i = 0; $i -lt $MaxSeconds; $i += 2) {
        try {
            $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
            if ($r.StatusCode -eq 200) { return $true }
        } catch { }
        Start-Sleep -Seconds 2
    }
    return $false
}

function Get-LanIp {
    $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown" } |
        Select-Object -First 1 -ExpandProperty IPAddress
    if ($ip) { return $ip }
    return "192.168.3.36"
}

if ($Stop) {
    Write-Host "Stopping test backend ($TestApiPort) and admin ($TestAdminPort)..."
    Stop-Port $TestApiPort
    Stop-Port $TestAdminPort
    Write-Host "Done. Docker test containers left running (use: docker compose -f docker-compose.test.yml down)"
    exit 0
}

Write-Host "=== 盲盒商城 · 测试环境部署 ===" -ForegroundColor Cyan
Write-Host "隔离说明: 端口/数据库/Redis/安装包 与 dev(9912) 及四方系统 分离" -ForegroundColor DarkGray

if ($ResetDb) {
    Write-Host "Resetting test database volume..." -ForegroundColor Yellow
    Push-Location $Root
    docker compose -f docker-compose.test.yml down -v
    Pop-Location
}

Write-Host "Starting MySQL ($TestMySqlPort) + Redis ($TestRedisPort)..."
Push-Location $Root
docker compose -f docker-compose.test.yml up -d
Pop-Location

Write-Host "Waiting for MySQL health..."
for ($i = 0; $i -lt 60; $i++) {
    $status = docker inspect -f "{{.State.Health.Status}}" mystery-box-test-mysql 2>$null
    if ($status -eq "healthy") { break }
    Start-Sleep -Seconds 2
}

if (-not (Test-Path $PrivateTestYml)) {
    if (Test-Path $PrivateTestExample) {
        Copy-Item $PrivateTestExample $PrivateTestYml
        Write-Host "Created application-private-test.yml from example."
    } else {
        Write-Warning "Missing application-private-test.yml"
    }
}

if (-not $AdminOnly) {
    if (Test-PortListen $TestApiPort) {
        Write-Host "Port $TestApiPort in use — stopping..."
        Stop-Port $TestApiPort
    }
    $env:SPRING_PROFILES_ACTIVE = "testenv,private-test"
    $env:TEST_SERVER_PORT = "$TestApiPort"
    Write-Host "Starting backend on http://127.0.0.1:$TestApiPort (profile: testenv,private-test)..."
    Start-Process powershell -ArgumentList @(
        "-NoExit", "-Command",
        "Set-Location '$BackendDir'; `$env:SPRING_PROFILES_ACTIVE='testenv,private-test'; `$env:TEST_SERVER_PORT='$TestApiPort'; mvn -DskipTests spring-boot:run"
    ) | Out-Null
    if (-not (Wait-HttpOk "http://127.0.0.1:$TestApiPort/actuator/health" 180)) {
        Write-Warning "Backend health check timed out — check backend window."
    } else {
        Write-Host "Backend is healthy." -ForegroundColor Green
    }
}

if (-not $BackendOnly) {
    if (Test-PortListen $TestAdminPort) {
        Write-Host "Port $TestAdminPort in use — stopping..."
        Stop-Port $TestAdminPort
    }
    Write-Host "Starting admin on http://127.0.0.1:$TestAdminPort ..."
    Start-Process powershell -ArgumentList @(
        "-NoExit", "-Command",
        "Set-Location '$AdminDir'; npm run dev:test"
    ) | Out-Null
}

if ($BuildApk) {
    $lanIp = Get-LanIp
    $envFile = Join-Path $MobileDir ".env.test"
    $envTarget = Join-Path $MobileDir ".env"
    $apkOut = "D:\软件安装\mystery-box-test-harmony.apk"
    Write-Host "Building test APK (package: com.mysterybox.mobile.test)..."
    Copy-Item -Force $envFile $envTarget
    $content = Get-Content $envTarget -Raw
    if ($ServerApi -or ($content -match 'EXPO_PUBLIC_API_BASE_URL=https?://')) {
        Write-Host "Using server API from .env.test (no LAN IP override)"
    } else {
        $content = $content -replace "EXPO_PUBLIC_API_BASE_URL=.*", "EXPO_PUBLIC_API_BASE_URL=http://${lanIp}:$TestApiPort"
        Set-Content -Path $envTarget -Value $content -NoNewline
        Write-Host "API for device: http://${lanIp}:$TestApiPort"
    }
    Push-Location (Join-Path $MobileDir "android")
    .\gradlew assembleDebug --no-daemon
    Copy-Item -Force "app\build\outputs\apk\debug\app-debug.apk" $apkOut
    Pop-Location
    Write-Host "APK: $apkOut" -ForegroundColor Green
}

Write-Host ""
Write-Host "========== 测试环境就绪 ==========" -ForegroundColor Green
Write-Host "管理端: http://127.0.0.1:$TestAdminPort"
Write-Host "API:    http://127.0.0.1:$TestApiPort"
Write-Host "健康:   http://127.0.0.1:$TestApiPort/actuator/health"
Write-Host ""
Write-Host 'Admin login: admin_test / Admin@Test2026'
Write-Host 'App login: 13900000001 / Test@123456 (OTP mock: 000000)'
Write-Host ""
Write-Host "Mobile APK: mystery-box-test-harmony.apk (com.mysterybox.mobile.test)"
Write-Host "Docs: docs\TEST_ENV_GUIDE.md"
Write-Host "Stop: .\scripts\deploy-test.ps1 -Stop"

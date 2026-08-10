# 本地开发：检测依赖 → 启动后端 (9912) + 管理端 (5177)
# 用法: .\scripts\dev.ps1 [-BackendOnly] [-AdminOnly] [-UseDocker]
param(
    [switch]$BackendOnly,
    [switch]$AdminOnly,
    [switch]$UseDocker
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $Root "mystery-box-backend"
$AdminDir = Join-Path $Root "mystery-box-admin"
$PrivateYml = Join-Path $BackendDir "src\main\resources\application-private.yml"
$ExampleYml = Join-Path $BackendDir "src\main\resources\application-private.example.yml"
$ComposeFile = Join-Path $Root "docker-compose.yml"

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

function Wait-HttpOk([string]$Url, [int]$MaxSeconds = 120) {
    for ($i = 0; $i -lt $MaxSeconds; $i += 2) {
        try {
            $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
            if ($r.StatusCode -eq 200) { return $true }
        } catch { }
        Start-Sleep -Seconds 2
    }
    return $false
}

if ($UseDocker -and (Test-Path $ComposeFile)) {
    Write-Host "Starting MySQL + Redis via docker compose..."
    Push-Location $Root
    docker compose up -d
    Pop-Location
    Start-Sleep -Seconds 5
}

if (-not $AdminOnly) {
    if (-not (Test-PortListen 3306)) {
        Write-Warning "MySQL (3306) not listening. Run: docker compose up -d  (in mystery-box-main)"
    }
    if (-not (Test-PortListen 6379)) {
        Write-Warning "Redis (6379) not listening. Run: docker compose up -d"
    }
}

if (-not (Test-Path $PrivateYml)) {
    if (Test-Path $ExampleYml) {
        Copy-Item $ExampleYml $PrivateYml
        Write-Host "Created application-private.yml from example — edit DB password if needed."
    } else {
        Write-Warning "Missing application-private.yml"
    }
}

if (-not $AdminOnly) {
    if (Test-PortListen 9912) {
        Write-Host "Port 9912 in use — stopping existing process..."
        Stop-Port 9912
    }
    Write-Host "Starting backend on http://127.0.0.1:9912 ..."
    Start-Process powershell -ArgumentList @(
        "-NoExit", "-Command",
        "Set-Location '$BackendDir'; mvn -DskipTests spring-boot:run"
    ) | Out-Null
    if (-not (Wait-HttpOk "http://127.0.0.1:9912/actuator/health" 120)) {
        Write-Warning "Backend health check timed out — check the backend window for errors."
    } else {
        Write-Host "Backend is healthy."
    }
}

if (-not $BackendOnly) {
    Write-Host "Starting admin on http://127.0.0.1:5177 ..."
    Start-Process powershell -ArgumentList @(
        "-NoExit", "-Command",
        "Set-Location '$AdminDir'; npm run dev"
    ) | Out-Null
}

Write-Host ""
Write-Host "Admin: http://127.0.0.1:5177  |  API: http://127.0.0.1:9912"
Write-Host "Login: admin / Admin@123456"
Write-Host "Docker deps: docker compose up -d  (from mystery-box-main)"

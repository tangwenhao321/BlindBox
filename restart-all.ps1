$ErrorActionPreference = "SilentlyContinue"

function Stop-ByPort {
  param([int]$Port)
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($null -ne $conn) {
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
  }
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "mystery-box-backend"
$admin = Join-Path $root "mystery-box-admin"
$mobile = Join-Path $root "mystery-box-mobile-app"
$composeFile = Join-Path $root "docker-compose.local.yml"

Write-Host "Stopping existing services..."
Stop-ByPort -Port 9912
Stop-ByPort -Port 5177
Stop-ByPort -Port 8081
Stop-ByPort -Port 19000

if (Test-Path $composeFile) {
  Write-Host "Starting local MySQL/Redis (docker compose)..."
  docker compose -f $composeFile up -d
}

Write-Host "Starting backend on 9912..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backend'; mvn spring-boot:run"

Write-Host "Starting admin on 5177..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$admin'; npm run dev -- --host 0.0.0.0 --port 5177"

Write-Host "Starting mobile app (Expo hot reload)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$mobile'; npm run start"

Write-Host "All services restarted. Backend: http://localhost:9912  Admin: http://localhost:5177"

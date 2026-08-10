# Start mystery-box local stack (backend + Expo). Run from mystery-box-main:
#   powershell -ExecutionPolicy Bypass -File scripts/start-local.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

$env:REDIS_URL = if ($env:REDIS_URL) { $env:REDIS_URL } else { "redis://127.0.0.1:6380/0" }
$env:DEV_DB_PASSWORD = if ($env:DEV_DB_PASSWORD) { $env:DEV_DB_PASSWORD } else { "Admin123#" }
$env:ANDROID_HOME = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "$env:LOCALAPPDATA\Android\Sdk" }

function Test-PortOpen($port) {
  try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect("127.0.0.1", $port)
    $tcp.Close()
    return $true
  } catch { return $false }
}

if (-not (Test-PortOpen 3306)) {
  Write-Warning "MySQL 3306 not reachable. Start MySQL or: docker compose -f docker-compose.local.yml up -d"
}

if (-not (Test-PortOpen 6380) -and -not (Test-PortOpen 6379)) {
  Write-Warning "Redis not reachable on 6380/6379. Start Redis or Docker compose."
}

if (-not (Test-PortOpen 9912)) {
  Write-Host "Starting backend on http://localhost:9912 ..."
  Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "cd '$root\mystery-box-backend'; `$env:REDIS_URL='$($env:REDIS_URL)'; `$env:DEV_DB_PASSWORD='$($env:DEV_DB_PASSWORD)'; mvn spring-boot:run '-Dspring-boot.run.profiles=dev,private'"
  )
  for ($i = 0; $i -lt 60; $i++) {
    Start-Sleep -Seconds 2
    try {
      $h = Invoke-RestMethod "http://localhost:9912/actuator/health" -TimeoutSec 2
      if ($h.status -eq "UP") { Write-Host "Backend is UP."; break }
    } catch { }
  }
} else {
  Write-Host "Backend already listening on 9912."
}

if (-not (Test-PortOpen 8083)) {
  Write-Host "Starting Expo Metro on http://localhost:8083 ..."
  Start-Process powershell -ArgumentList @(
    "-NoExit", "-Command",
    "cd '$root\mystery-box-mobile-app'; `$env:ANDROID_HOME='$($env:ANDROID_HOME)'; npm run start"
  )
} else {
  Write-Host "Expo Metro already on 8083."
}

Write-Host ""
Write-Host "API:   http://localhost:9912"
Write-Host "Metro: http://localhost:8083"
Write-Host "Dev build (device/emulator): cd mystery-box-mobile-app; npm run android"

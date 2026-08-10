# Install / start local Redis on 127.0.0.1:6380 (matches application-dev.yml default).
# Binaries go to D:\软件安装\redis (keeps your existing redis.windows.conf).

param(
  [string]$RedisRoot = $(if ($env:MYSTERY_BOX_REDIS_ROOT) { $env:MYSTERY_BOX_REDIS_ROOT } else { "D:\软件安装\redis" }),
  [int]$Port = 6380
)

$ErrorActionPreference = "Stop"

function Test-PortOpen([int]$p) {
  try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $tcp.Connect("127.0.0.1", $p)
    $tcp.Close()
    return $true
  } catch { return $false }
}

New-Item -ItemType Directory -Force -Path $RedisRoot | Out-Null

$serverExe = Join-Path $RedisRoot "redis-server.exe"
$cliExe = Join-Path $RedisRoot "redis-cli.exe"
$confFile = Join-Path $RedisRoot "redis.windows.conf"
$zipUrl = "https://github.com/tporadowski/redis/releases/download/v5.0.14.1/Redis-x64-5.0.14.1.zip"

# Also accept redis-server in subfolder after zip extract
if (-not (Test-Path $serverExe)) {
  $found = Get-ChildItem -Path $RedisRoot -Filter "redis-server.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($found) {
    Copy-Item $found.FullName $serverExe -Force
    $foundCli = Join-Path $found.DirectoryName "redis-cli.exe"
    if (Test-Path $foundCli) { Copy-Item $foundCli $cliExe -Force }
  }
}

if (-not (Test-Path $serverExe)) {
  Write-Host "Downloading Redis for Windows (tporadowski port, ~12MB) ..."
  $zipPath = Join-Path $RedisRoot "redis-download.zip"
  $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
  if ($curl) {
    & curl.exe -L --retry 5 --retry-delay 3 -o $zipPath $zipUrl
  } else {
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing -TimeoutSec 300
  }
  if (-not (Test-Path $zipPath) -or (Get-Item $zipPath).Length -lt 100KB) {
    throw "Redis download failed: $zipPath"
  }
  Expand-Archive -Path $zipPath -DestinationPath $RedisRoot -Force
  Remove-Item -Force $zipPath -ErrorAction SilentlyContinue
  $found = Get-ChildItem -Path $RedisRoot -Filter "redis-server.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($found -and $found.FullName -ne $serverExe) {
    Copy-Item $found.FullName $serverExe -Force
    $foundCli = Join-Path $found.DirectoryName "redis-cli.exe"
    if (Test-Path $foundCli) { Copy-Item $foundCli $cliExe -Force }
  }
}

if (-not (Test-Path $confFile)) {
  @"
bind 127.0.0.1
port $Port
maxmemory 256mb
"@ | Set-Content -Path $confFile -Encoding UTF8
}

if (Test-PortOpen $Port) {
  Write-Host "Redis already listening on port $Port."
  & $cliExe -p $Port ping
  exit 0
}

Write-Host "Starting Redis on 127.0.0.1:$Port ..."
Start-Process -FilePath $serverExe -ArgumentList @($confFile) -WorkingDirectory $RedisRoot -WindowStyle Minimized

for ($i = 0; $i -lt 15; $i++) {
  Start-Sleep -Milliseconds 400
  if (Test-PortOpen $Port) { break }
}

if (-not (Test-PortOpen $Port)) {
  throw "Redis did not start on port $Port. Check $RedisRoot logs or port conflict."
}

& $cliExe -p $Port ping
Write-Host "Redis OK on port $Port"

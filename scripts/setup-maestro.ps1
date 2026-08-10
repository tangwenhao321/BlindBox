# Install Maestro CLI to D:\软件安装\Maestro (override with -InstallRoot).
# Usage: powershell -ExecutionPolicy Bypass -File scripts/setup-maestro.ps1

param(
  [string]$InstallRoot = "D:\软件安装\Maestro",
  [string]$Version = "cli-2.6.0"
)

$ErrorActionPreference = "Stop"

$zipUrl = "https://github.com/mobile-dev-inc/maestro/releases/download/$Version/maestro.zip"
$zipPath = Join-Path $InstallRoot "maestro.zip"
$binDir = Join-Path $InstallRoot "maestro\bin"
$maestroExe = Join-Path $binDir "maestro.bat"

New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null

if (-not (Test-Path $maestroExe)) {
  Write-Host "Downloading Maestro $Version (~200MB, may take several minutes) ..."
  New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null
  $curl = Get-Command curl.exe -ErrorAction SilentlyContinue
  if ($curl) {
    $resume = if ((Test-Path $zipPath) -and (Get-Item $zipPath).Length -gt 0) { "-C" ; "-" } else { @() }
    & curl.exe -L --retry 5 --retry-delay 3 @resume -o $zipPath $zipUrl
  } else {
    Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing -TimeoutSec 600
  }
  if (-not (Test-Path $zipPath) -or (Get-Item $zipPath).Length -lt 50MB) {
    throw "Download failed or incomplete ($zipPath). Need ~200MB. Retry or download manually from GitHub releases."
  }
  Expand-Archive -Path $zipPath -DestinationPath $InstallRoot -Force
  Remove-Item -Force $zipPath -ErrorAction SilentlyContinue
}

if (-not (Test-Path $maestroExe)) {
  throw "Maestro not found at $maestroExe after extract"
}

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$binDir*") {
  $userPath = if ($userPath) { "$userPath;$binDir" } else { $binDir }
  [Environment]::SetEnvironmentVariable("Path", $userPath, "User")
}

$env:Path = "$binDir;$env:Path"
Write-Host "Maestro installed: $binDir"
& $maestroExe --version

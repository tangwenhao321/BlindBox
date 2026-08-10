# Install HiSuite to D:\软件安装\HiSuite (Huawei USB/HDB drivers for device connection).
param(
  [string]$InstallDir = "D:\软件安装\HiSuite"
)

$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

$installer = Join-Path $InstallDir "HiSuite.exe"
if (-not (Test-Path $installer)) {
  Write-Host "Download HiSuite from https://consumer.huawei.com/cn/support/hisuite/ to:"
  Write-Host "  $installer"
  exit 1
}

Write-Host "Launching HiSuite installer (follow GUI, install to $InstallDir if prompted)..."
Start-Process -FilePath $installer -Wait
Write-Host "After install: connect phone (USB file transfer), allow USB debug, run: adb devices"

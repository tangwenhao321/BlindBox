# Installs Android SDK command-line tools, platform-tools, API 35 platform, and build-tools 35.
# Run from repo: npm run setup:android
# Requires: PowerShell 5+, network, ~1.5 GB disk under %LOCALAPPDATA%\Android\Sdk

$ErrorActionPreference = "Stop"

$sdkRoot = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { Join-Path $env:LOCALAPPDATA "Android\Sdk" }
$cmdlineRoot = Join-Path $sdkRoot "cmdline-tools"
$latestDir = Join-Path $cmdlineRoot "latest"
$zipUrl = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
$zipPath = Join-Path $env:TEMP "android-cmdline-tools.zip"

Write-Host "Android SDK root: $sdkRoot"

New-Item -ItemType Directory -Force -Path $sdkRoot | Out-Null
New-Item -ItemType Directory -Force -Path $cmdlineRoot | Out-Null

if (-not (Test-Path (Join-Path $latestDir "bin\sdkmanager.bat"))) {
  Write-Host "Downloading command-line tools..."
  Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
  $extractDir = Join-Path $env:TEMP "android-cmdline-tools-extract"
  if (Test-Path $extractDir) { Remove-Item -Recurse -Force $extractDir }
  Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force
  if (Test-Path $latestDir) { Remove-Item -Recurse -Force $latestDir }
  $inner = Get-ChildItem -Path $extractDir -Directory | Select-Object -First 1
  Move-Item -Path $inner.FullName -Destination $latestDir
  Remove-Item -Force $zipPath -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force $extractDir -ErrorAction SilentlyContinue
}

$sdkmanager = Join-Path $latestDir "bin\sdkmanager.bat"
if (-not (Test-Path $sdkmanager)) {
  throw "sdkmanager not found at $sdkmanager"
}

Write-Host "Installing platform-tools, platforms;android-35, build-tools;35.0.0..."
$yes = ("y`n" * 40)
$yes | & $sdkmanager --sdk_root=$sdkRoot "platform-tools" "platforms;android-35" "build-tools;35.0.0"

$platformTools = Join-Path $sdkRoot "platform-tools"
if (-not (Test-Path (Join-Path $platformTools "adb.exe"))) {
  throw "adb not found after install; check sdkmanager output"
}

[Environment]::SetEnvironmentVariable("ANDROID_HOME", $sdkRoot, "User")
[Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $sdkRoot, "User")

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$pathsToAdd = @($platformTools, (Join-Path $latestDir "bin"))
foreach ($p in $pathsToAdd) {
  if ($userPath -notlike "*$p*") {
    $userPath = if ($userPath) { "$userPath;$p" } else { $p }
  }
}
[Environment]::SetEnvironmentVariable("Path", $userPath, "User")

$env:ANDROID_HOME = $sdkRoot
$env:ANDROID_SDK_ROOT = $sdkRoot
$env:Path = "$platformTools;$latestDir\bin;$env:Path"

Write-Host "Done. ANDROID_HOME=$sdkRoot"
& (Join-Path $platformTools "adb.exe") version

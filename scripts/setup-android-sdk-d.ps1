# Install Android SDK to D:\软件安装\Android\Sdk (optional; avoids C: user profile).
# Usage: powershell -ExecutionPolicy Bypass -File scripts/setup-android-sdk-d.ps1

param(
  [string]$SdkRoot = "D:\软件安装\Android\Sdk"
)

$ErrorActionPreference = "Stop"

$sdkRoot = $SdkRoot
$cmdlineRoot = Join-Path $sdkRoot "cmdline-tools"
$latestDir = Join-Path $cmdlineRoot "latest"
$zipUrl = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
$zipPath = Join-Path $sdkRoot "android-cmdline-tools.zip"

Write-Host "Android SDK root: $sdkRoot"
New-Item -ItemType Directory -Force -Path $sdkRoot | Out-Null
New-Item -ItemType Directory -Force -Path $cmdlineRoot | Out-Null

if (-not (Test-Path (Join-Path $latestDir "bin\sdkmanager.bat"))) {
  Write-Host "Downloading command-line tools (~150MB) ..."
  Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
  $extractDir = Join-Path $sdkRoot "_extract"
  if (Test-Path $extractDir) { Remove-Item -Recurse -Force $extractDir }
  Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force
  if (Test-Path $latestDir) { Remove-Item -Recurse -Force $latestDir }
  $inner = Get-ChildItem -Path $extractDir -Directory | Select-Object -First 1
  Move-Item -Path $inner.FullName -Destination $latestDir
  Remove-Item -Force $zipPath -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force $extractDir -ErrorAction SilentlyContinue
}

$sdkmanager = Join-Path $latestDir "bin\sdkmanager.bat"
Write-Host "Installing platform-tools, platforms;android-35, build-tools;35.0.0 ..."
$yes = ("y`n" * 40)
$yes | & $sdkmanager --sdk_root=$sdkRoot "platform-tools" "platforms;android-35" "build-tools;35.0.0"

$platformTools = Join-Path $sdkRoot "platform-tools"
[Environment]::SetEnvironmentVariable("ANDROID_HOME", $sdkRoot, "User")
[Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $sdkRoot, "User")

$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
foreach ($p in @($platformTools, (Join-Path $latestDir "bin"))) {
  if ($userPath -notlike "*$p*") {
    $userPath = if ($userPath) { "$userPath;$p" } else { $p }
  }
}
[Environment]::SetEnvironmentVariable("Path", $userPath, "User")

$env:ANDROID_HOME = $sdkRoot
$env:Path = "$platformTools;$latestDir\bin;$env:Path"
Write-Host "Done. ANDROID_HOME=$sdkRoot (restart terminal)"
& (Join-Path $platformTools "adb.exe") version

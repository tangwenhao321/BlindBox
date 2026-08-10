# 从 Windows 本机上传代码到测试服务器并触发部署
# 用法:
#   .\scripts\deploy-test-remote.ps1 -ServerHost jarcheng.top -ServerUser root
#   .\scripts\deploy-test-remote.ps1 -ServerHost 101.37.39.40 -ServerUser root -FirstRun
#   .\scripts\deploy-test-remote.ps1 -ServerHost jarcheng.top -BuildApk
#
# 需本机: OpenSSH scp/ssh；服务器需 JDK17/Maven/Node/Nginx

param(
    [string]$ServerHost = "jarcheng.top",
    [string]$ServerUser = "root",
    [int]$ServerPort = 22,
    [string]$RemoteRoot = "/opt/mystery-box-test/src",
    [string]$DeployRoot = "/opt/mystery-box-test",
    [switch]$FirstRun,
    [switch]$BuildApk,
    [switch]$SkipUpload
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Archive = Join-Path $env:TEMP "mystery-box-test-src.tar.gz"
$Remote = "${ServerUser}@${ServerHost}"

function Invoke-Ssh([string]$Cmd) {
    ssh -p $ServerPort $Remote $Cmd
}

if (-not $SkipUpload) {
    Write-Host "Packing source (excluding node_modules, target)..."
    Push-Location $Root
    tar --exclude="mystery-box-mobile-app/node_modules" `
        --exclude="mystery-box-admin/node_modules" `
        --exclude="mystery-box-backend/target" `
        --exclude="mystery-box-mobile-app/android/.gradle" `
        --exclude="mystery-box-mobile-app/android/app/build" `
        -czf $Archive mystery-box-backend mystery-box-admin mystery-box-mobile-app `
        scripts deploy docker-compose.test.yml docs database.sql README.md
    Pop-Location

    Write-Host "Uploading to ${Remote}:${RemoteRoot} ..."
    Invoke-Ssh "mkdir -p $RemoteRoot $DeployRoot"
    scp -P $ServerPort $Archive "${Remote}:/tmp/mystery-box-test-src.tar.gz"
    Invoke-Ssh "set -e; mkdir -p $RemoteRoot; tar -xzf /tmp/mystery-box-test-src.tar.gz -C $RemoteRoot; rm -f /tmp/mystery-box-test-src.tar.gz; chmod +x $RemoteRoot/scripts/deploy-test-server.sh"
}

if ($FirstRun) {
    Write-Host "First-run bootstrap on server..."
    Invoke-Ssh "cd $RemoteRoot && sudo bash scripts/deploy-test-server.sh bootstrap"
    Write-Host ""
    Write-Host "IMPORTANT: SSH to server and:"
    Write-Host "  1. Edit $DeployRoot/.env (DB password, REDIS_URL)"
    Write-Host "  2. mysql -uroot -p < $RemoteRoot/deploy/sql/init-test-mysql.sql"
    Write-Host "  3. Merge deploy/nginx.jarcheng.test.conf.example into Nginx"
    Write-Host "  4. Re-run without -FirstRun to deploy"
    Write-Host ""
    exit 0
}

Write-Host "Running remote deploy (build + systemd)..."
Invoke-Ssh "cd $RemoteRoot && sudo bash scripts/deploy-test-server.sh deploy"

Write-Host ""
Write-Host "Remote deploy finished. Verify:"
Write-Host "  ssh $Remote 'sudo systemctl status mystery-box-test'"
Write-Host "  ssh $Remote 'curl -sf http://127.0.0.1:9913/actuator/health'"
Write-Host "  curl https://www.jarcheng.top/test-api/actuator/health"
Write-Host ""
Write-Host "Nginx: deploy/nginx.jarcheng.test.conf.example"
Write-Host "Guide: docs/TEST_ENV_GUIDE.md"

if ($BuildApk) {
    Write-Host "Building test APK (server API URL from .env.test)..."
    & (Join-Path $PSScriptRoot "deploy-test.ps1") -BuildApk -ServerApi
}

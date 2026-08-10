# Repair failed Flyway migration and optionally restart backend
param(
    [string]$DbPassword = "Admin123#",
    [string]$DbUser = "root",
    [string]$DbHost = "localhost:3306",
    [string]$DbName = "mystery_box",
    [switch]$RestartBackend
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$BackendDir = Join-Path $Root "mystery-box-backend"

Write-Host "Running Flyway repair on $DbName ..."
Push-Location $BackendDir
mvn -q org.flywaydb:flyway-maven-plugin:9.22.3:repair `
    "-Dflyway.url=jdbc:mysql://${DbHost}/${DbName}" `
    "-Dflyway.user=$DbUser" `
    "-Dflyway.password=$DbPassword" `
    "-Dflyway.locations=filesystem:src/main/resources/db/migration"
Pop-Location
Write-Host "Flyway repair done."

if ($RestartBackend) {
    & (Join-Path $Root "scripts\dev.ps1") -BackendOnly
}

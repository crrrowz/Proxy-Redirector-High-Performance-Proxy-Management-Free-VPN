param(
    [switch]$Release,
    [string]$Version = "0.0.1-dev"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$OutDir = Join-Path $Root "engine\build"
$EngineDir = Join-Path $Root "engine\cmd\engine"

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$BuildTime = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
$LDFlags = "-X main.Version=$Version -X main.BuildTime=$BuildTime"

Write-Host "Building Engine (Version: $Version)..." -ForegroundColor Cyan

Set-Location $Root
if ($Release) {
    Write-Host "Production Mode: garble + optimize" -ForegroundColor DarkGray
    garble -literals -tiny -seed=random build -ldflags "$LDFlags -s -w" -o "$OutDir\engine.exe" "$EngineDir"
} else {
    Write-Host "Development Mode" -ForegroundColor DarkGray
    go build -ldflags "$LDFlags" -o "$OutDir\engine.exe" "$EngineDir"
}

if ($LASTEXITCODE -ne 0) { Write-Error "Build failed"; exit 1 }

Write-Host "✅ Engine built → engine\build\engine.exe" -ForegroundColor Green

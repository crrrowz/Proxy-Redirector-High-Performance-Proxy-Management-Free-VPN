param(
    [switch]$Release,
    [string]$Version = "0.0.1-dev"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$OutDir = Join-Path $Root "client\build\bin"
$ClientDir = Join-Path $Root "client"

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

Write-Host "Building Client Wails App (Version: $Version)..." -ForegroundColor Cyan

Set-Location $ClientDir

if ($Release) {
    wails build -production -ldflags "-X main.Version=$Version -s -w"
} else {
    wails build -ldflags "-X main.Version=$Version"
}

if ($LASTEXITCODE -ne 0) { Write-Error "Build failed"; exit 1 }

Write-Host "✅ Client built → client\build\bin\" -ForegroundColor Green

param(
    [switch]$Release,
    [string]$Version = "0.0.1-dev"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$OutDir = Join-Path $Root "client\build"
$CliDir = Join-Path $Root "client\cmd\cli"

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$BuildTime = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
$LDFlags = "-X main.Version=$Version -X main.BuildTime=$BuildTime"

Write-Host "Building CLI Client (Version: $Version)..." -ForegroundColor Cyan

Set-Location $Root
if ($Release) {
    Write-Host "Production Mode: optimize" -ForegroundColor DarkGray
    go build -ldflags "$LDFlags -s -w" -o "$OutDir\proxy-cli.exe" "$CliDir"
} else {
    Write-Host "Development Mode" -ForegroundColor DarkGray
    go build -ldflags "$LDFlags" -o "$OutDir\proxy-cli.exe" "$CliDir"
}

if ($LASTEXITCODE -ne 0) { Write-Error "Build failed"; exit 1 }

Write-Host "✅ CLI Client built → client\build\proxy-cli.exe" -ForegroundColor Green

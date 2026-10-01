param(
    [switch]$Release,
    [string]$Version = "0.0.1-dev"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$OutDir = Join-Path $Root "engine\build"
$EngineDir = Join-Path $Root "engine\cmd\engine"

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$BuildTime = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$LDFlags = "-X main.Version=$Version -X main.BuildTime=$BuildTime"

Write-Host "Building Engine for Ubuntu Linux (Version: $Version)..." -ForegroundColor Cyan

Set-Location $Root
$env:GOOS="linux"
$env:GOARCH="amd64"

if ($Release) {
    Write-Host "Production Mode: garble + optimize" -ForegroundColor DarkGray
    garble -literals -tiny -seed=random build -ldflags "$LDFlags -s -w" -o "$OutDir\engine-linux-amd64" "$EngineDir"
} else {
    Write-Host "Development Mode" -ForegroundColor DarkGray
    go build -ldflags "$LDFlags" -o "$OutDir\engine-linux-amd64" "$EngineDir"
}

# Reset env vars
Remove-Item Env:\GOOS
Remove-Item Env:\GOARCH

if ($LASTEXITCODE -ne 0) { Write-Error "Build failed"; exit 1 }

Write-Host "✅ Linux Engine built → engine\build\engine-linux-amd64" -ForegroundColor Green

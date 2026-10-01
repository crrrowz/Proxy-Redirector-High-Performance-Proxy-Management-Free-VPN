$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "🚀 Starting Proxy Redirector v3 in Development Mode..." -ForegroundColor Cyan

# Start Engine in the background
Write-Host "Starting Engine..." -ForegroundColor Yellow
$engineProc = Start-Process -FilePath "go" -ArgumentList "run ./engine/cmd/engine/" -WorkingDirectory $Root -PassThru -NoNewWindow

Start-Sleep -Seconds 2

# Start Client via Wails dev in foreground
Write-Host "Starting Client (Wails dev)..." -ForegroundColor Yellow
Set-Location "$Root\client"
wails dev

# Cleanup Engine when Wails stops
Write-Host "Stopping Engine..." -ForegroundColor Yellow
taskkill /PID $engineProc.Id /T /F | Out-Null

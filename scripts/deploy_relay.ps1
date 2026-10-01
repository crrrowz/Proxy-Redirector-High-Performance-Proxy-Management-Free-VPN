param(
    [string]$SaaSUrl = "http://localhost:4000",
    [string]$Region = "US-East",
    [string]$Country = "US",
    [int]$SocksPort = 1080,
    [int]$HttpPort = 8080,
    [int]$GRPCPort = 50051
)

$ErrorActionPreference = "Stop"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " 🚀 Proxy Redirector Windows Relay Node Initializer ($Region)" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# 1. Detect Local/Public IP
$PublicIp = "127.0.0.1"
try {
    $PublicIp = (Invoke-RestMethod -Uri "https://api.ipify.org" -TimeoutSec 3).Trim()
} catch {
    $PublicIp = "127.0.0.1"
}

Write-Host "📍 Node IP: $PublicIp" -ForegroundColor Yellow

# 2. Send Registration Heartbeat
$Payload = @{
    publicIp = $PublicIp
    region = $Region
    country = $Country
    currentLoad = 0.0
    activeSessions = 0
    status = "ONLINE"
} | ConvertTo-Json

try {
    $Resp = Invoke-RestMethod -Uri "$SaaSUrl/api/v1/relays/heartbeat" -Method Post -Body $Payload -ContentType "application/json"
    Write-Host "✅ Relay successfully registered with SaaS API!" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Notice: SaaS heartbeat failed to connect: $_" -ForegroundColor Yellow
}

Write-Host "🎉 Node initialization complete." -ForegroundColor Green

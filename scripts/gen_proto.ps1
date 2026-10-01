$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$ProtoDir = Join-Path $Root "proto\engine\v1"
$OutEngine = Join-Path $Root "engine\internal\server\pb"
$OutClient = Join-Path $Root "client\internal\engine\pb"

Write-Host "Generating proto stubs..." -ForegroundColor Cyan

# Create output dirs
New-Item -ItemType Directory -Force -Path $OutEngine, $OutClient | Out-Null

# Generate — use proto dir as proto_path so output is flat
protoc `
    --proto_path="$ProtoDir" `
    --go_out="$OutEngine" --go_opt=paths=source_relative `
    --go-grpc_out="$OutEngine" --go-grpc_opt=paths=source_relative `
    engine.proto

if ($LASTEXITCODE -ne 0) { Write-Error "protoc failed"; exit 1 }

# Copy to Client
Copy-Item "$OutEngine\*.go" "$OutClient\" -Force

Write-Host "Done!" -ForegroundColor Green
Get-ChildItem "$OutEngine" -Filter "*.go" | ForEach-Object {
    Write-Host "  $($_.Name) ($($_.Length) bytes)"
}

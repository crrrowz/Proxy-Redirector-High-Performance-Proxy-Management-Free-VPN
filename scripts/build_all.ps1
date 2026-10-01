param(
    [switch]$Release,
    [string]$Version = "0.0.1-dev"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " Building Proxy Redirector v3 ($Version) " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Generate Proto
& "$PSScriptRoot\gen_proto.ps1"

# 2. Build Engine
& "$PSScriptRoot\build_engine.ps1" -Version $Version $(if($Release){"-Release"})

# 3. Build CLI Client
& "$PSScriptRoot\build_cli.ps1" -Version $Version $(if($Release){"-Release"})

# 4. Build GUI Client
& "$PSScriptRoot\build_client.ps1" -Version $Version $(if($Release){"-Release"})

Write-Host "🎉 All builds completed successfully in their respective build directories" -ForegroundColor Green

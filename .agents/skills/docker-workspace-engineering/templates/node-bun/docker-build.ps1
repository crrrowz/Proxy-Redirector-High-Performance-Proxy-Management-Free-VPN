[CmdletBinding()]
param (
    [switch]$RunTests,
    [switch]$Export,
    [switch]$NoCache,
    [switch]$NoPrune
)

$ErrorActionPreference = "Stop"

Write-Host "Building Node.js Application via Docker..." -ForegroundColor Cyan

if ($Export) {
    Write-Host "Exporting build artifacts to local directory..." -ForegroundColor Cyan
    $buildArgs = @("build", "--target", "export", "--output", "type=local,dest=.")
    if ($NoCache) { $buildArgs += "--no-cache" }
    $buildArgs += "."
    & docker @buildArgs
} else {
    $buildArgs = @("build", "--target", "development", "-t", "app:dev")
    if ($NoCache) { $buildArgs += "--no-cache" }
    $buildArgs += "."
    & docker @buildArgs
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker build failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host "Docker build operation completed successfully!" -ForegroundColor Green

if ($RunTests) {
    Write-Host "Running automated tests inside Docker..." -ForegroundColor Yellow
    docker compose run --rm test
}

# Automatically clean up dangling build layers
if (-not $NoPrune) {
    Write-Host "Automatically cleaning up dangling build layers..." -ForegroundColor Gray
    docker image prune --filter "dangling=true" -f
}

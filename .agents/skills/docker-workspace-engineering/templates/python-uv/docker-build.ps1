[CmdletBinding()]
param (
    [switch]$RunTests,
    [switch]$NoCache,
    [switch]$NoPrune
)

$ErrorActionPreference = "Stop"

Write-Host "Building Python Application via Docker Container..." -ForegroundColor Cyan

$buildArgs = @("build", "--target", "development", "-t", "app:dev")
if ($NoCache) {
    $buildArgs += "--no-cache"
}
$buildArgs += "."

& docker @buildArgs

if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker build failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

Write-Host "Container successfully built and tagged as 'app:dev'" -ForegroundColor Green

if ($RunTests) {
    Write-Host "Running automated test suite inside Docker..." -ForegroundColor Yellow
    docker compose run --rm test
}

# Automatically clean up dangling build layers
if (-not $NoPrune) {
    Write-Host "Automatically cleaning up dangling build layers..." -ForegroundColor Gray
    docker image prune --filter "dangling=true" -f
}

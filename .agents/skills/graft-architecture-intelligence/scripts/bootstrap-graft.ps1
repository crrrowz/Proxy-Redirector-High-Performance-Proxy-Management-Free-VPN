[CmdletBinding()]
param (
    [string]$TargetDir = (Get-Location).Path
)

$ErrorActionPreference = "Stop"
$SkillDir = Split-Path $PSScriptRoot -Parent
$TemplatesDir = Join-Path $SkillDir "templates"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "     GRAFT ARCHITECTURE CONTEXT ENGINE: BOOTSTRAP           " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Target Workspace: $TargetDir" -ForegroundColor Gray

# 1. Create clean subdirectories
$dockerDir = Join-Path $TargetDir "docker"
$scriptsDir = Join-Path $TargetDir "scripts"
$docsDir = Join-Path $TargetDir "docs"

foreach ($d in @($dockerDir, $scriptsDir, $docsDir)) {
    if (-not (Test-Path $d)) {
        New-Item -ItemType Directory -Path $d -Force | Out-Null
    }
}

# 2. Deploy Dockerfile to docker/
$destDockerfile = Join-Path $dockerDir "Dockerfile.graft"
if (-not (Test-Path $destDockerfile)) {
    Copy-Item -Path (Join-Path $TemplatesDir "Dockerfile.graft") -Destination $destDockerfile -Force
    Write-Host "  + Created: docker/Dockerfile.graft" -ForegroundColor Green
} else {
    Write-Host "  = Existing: docker/Dockerfile.graft (preserved)" -ForegroundColor Gray
}

# 3. Deploy scripts to scripts/
$destGraftBuild = Join-Path $scriptsDir "graft-build.ps1"
if (-not (Test-Path $destGraftBuild)) {
    Copy-Item -Path (Join-Path $TemplatesDir "graft-build.ps1") -Destination $destGraftBuild -Force
    Write-Host "  + Created: scripts/graft-build.ps1" -ForegroundColor Green
} else {
    Write-Host "  = Existing: scripts/graft-build.ps1 (preserved)" -ForegroundColor Gray
}

$destGraftQuery = Join-Path $scriptsDir "graft-query.ps1"
if (-not (Test-Path $destGraftQuery)) {
    Copy-Item -Path (Join-Path $TemplatesDir "graft-query.ps1") -Destination $destGraftQuery -Force
    Write-Host "  + Created: scripts/graft-query.ps1" -ForegroundColor Green
} else {
    Write-Host "  = Existing: scripts/graft-query.ps1 (preserved)" -ForegroundColor Gray
}

# 4. Deploy AGENTS.md to root
$destAgents = Join-Path $TargetDir "AGENTS.md"
if (-not (Test-Path $destAgents)) {
    Copy-Item -Path (Join-Path $TemplatesDir "AGENTS.md") -Destination $destAgents -Force
    Write-Host "  + Created: AGENTS.md" -ForegroundColor Green
} else {
    Write-Host "  = Existing: AGENTS.md (preserved)" -ForegroundColor Gray
}

# 5. Update .gitignore
$gitignorePath = Join-Path $TargetDir ".gitignore"
if (Test-Path $gitignorePath) {
    $content = Get-Content $gitignorePath -Raw
    if ($content -notmatch '(?m)^graft/') {
        Add-Content -Path $gitignorePath -Value "`n# Graft architecture cache`ngraft/"
        Write-Host "  + Added 'graft/' to .gitignore" -ForegroundColor Green
    }
} else {
    Set-Content -Path $gitignorePath -Value "# Graft architecture cache`ngraft/"
    Write-Host "  + Created .gitignore with 'graft/'" -ForegroundColor Green
}

# 6. Build Architecture Graph via Docker
Write-Host "`n>>> Running initial Graft AST build..." -ForegroundColor Cyan
Set-Location $TargetDir
& powershell -ExecutionPolicy Bypass -File (Join-Path $scriptsDir "graft-build.ps1")

# 7. Display Zero-Token Map
Write-Host "`n>>> Initializing Repository Orientation Map..." -ForegroundColor Cyan
& powershell -ExecutionPolicy Bypass -File (Join-Path $scriptsDir "graft-query.ps1") map

Write-Host "`n[SUCCESS] Graft is fully bootstrapped in organized folders (docker/, scripts/, docs/)!" -ForegroundColor Green

[CmdletBinding()]
param (
    [string]$TargetDir = (Get-Location).Path,
    [ValidateSet("auto", "node", "python", "go", "rust")]
    [string]$Stack = "auto"
)

$ErrorActionPreference = "Stop"
$SkillDir = Split-Path $PSScriptRoot -Parent
$TemplatesDir = Join-Path $SkillDir "templates"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "     DOCKER WORKSPACE ENGINEERING: AUTOMATED BOOTSTRAP       " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Target Workspace: $TargetDir" -ForegroundColor Gray

# 1. Multi-Stack Detection
if ($Stack -eq "auto") {
    if (Test-Path (Join-Path $TargetDir "go.mod")) {
        $detectedStack = "go"
    } elseif (Test-Path (Join-Path $TargetDir "Cargo.toml")) {
        $detectedStack = "rust"
    } elseif ((Test-Path (Join-Path $TargetDir "pyproject.toml")) -or (Test-Path (Join-Path $TargetDir "requirements.txt")) -or (Test-Path (Join-Path $TargetDir "Pipfile"))) {
        $detectedStack = "python"
    } elseif ((Test-Path (Join-Path $TargetDir "package.json")) -or (Test-Path (Join-Path $TargetDir "bun.lock")) -or (Test-Path (Join-Path $TargetDir "pnpm-lock.yaml"))) {
        $detectedStack = "node"
    } else {
        $detectedStack = "node"
    }
} else {
    $detectedStack = $Stack
}

Write-Host "`n>>> Detected Tech Stack: " -NoNewline -ForegroundColor Cyan
Write-Host "$detectedStack" -ForegroundColor Yellow

$stackTemplateDir = switch ($detectedStack) {
    "python" { Join-Path $TemplatesDir "python-uv" }
    "go"     { Join-Path $TemplatesDir "go" }
    "rust"   { Join-Path $TemplatesDir "rust" }
    default  { Join-Path $TemplatesDir "node-bun" }
}
$universalDir = Join-Path $TemplatesDir "universal"

# 2. Create clean subdirectories
$dockerDir = Join-Path $TargetDir "docker"
$scriptsDir = Join-Path $TargetDir "scripts"
$docsDir = Join-Path $TargetDir "docs"
$devcontainerDir = Join-Path $TargetDir ".devcontainer"

foreach ($d in @($dockerDir, $scriptsDir, $docsDir, $devcontainerDir)) {
    if (-not (Test-Path $d)) {
        New-Item -ItemType Directory -Path $d -Force | Out-Null
    }
}

# 3. Copy .dockerignore to root
$destDockerignore = Join-Path $TargetDir ".dockerignore"
if (-not (Test-Path $destDockerignore)) {
    Copy-Item -Path (Join-Path $universalDir ".dockerignore") -Destination $destDockerignore -Force
    Write-Host "  + Created: .dockerignore" -ForegroundColor Green
} else {
    Write-Host "  = Existing: .dockerignore (preserved)" -ForegroundColor Gray
}

# 4. Copy .devcontainer/devcontainer.json
$destDevcontainer = Join-Path $devcontainerDir "devcontainer.json"
if (-not (Test-Path $destDevcontainer)) {
    Copy-Item -Path (Join-Path $universalDir ".devcontainer\devcontainer.json") -Destination $destDevcontainer -Force
    Write-Host "  + Created: .devcontainer/devcontainer.json" -ForegroundColor Green
} else {
    Write-Host "  = Existing: .devcontainer/devcontainer.json (preserved)" -ForegroundColor Gray
}

# 5. Copy Dockerfile to docker/
$destDockerfile = Join-Path $dockerDir "Dockerfile"
if (-not (Test-Path $destDockerfile)) {
    Copy-Item -Path (Join-Path $stackTemplateDir "Dockerfile") -Destination $destDockerfile -Force
    Write-Host "  + Created: docker/Dockerfile ($detectedStack multi-stage)" -ForegroundColor Green
} else {
    Write-Host "  = Existing: docker/Dockerfile (preserved)" -ForegroundColor Gray
}

# 6. Copy docker-compose.yml to docker/
$destCompose = Join-Path $dockerDir "docker-compose.yml"
if (-not (Test-Path $destCompose)) {
    Copy-Item -Path (Join-Path $stackTemplateDir "docker-compose.yml") -Destination $destCompose -Force
    Write-Host "  + Created: docker/docker-compose.yml ($detectedStack with volume isolation)" -ForegroundColor Green
} else {
    Write-Host "  = Existing: docker/docker-compose.yml (preserved)" -ForegroundColor Gray
}

# 7. Copy build runners to scripts/
$destBuildScript = Join-Path $scriptsDir "docker-build.ps1"
if (-not (Test-Path $destBuildScript)) {
    Copy-Item -Path (Join-Path $stackTemplateDir "docker-build.ps1") -Destination $destBuildScript -Force
    Write-Host "  + Created: scripts/docker-build.ps1 ($detectedStack PowerShell runner)" -ForegroundColor Green
} else {
    Write-Host "  = Existing: scripts/docker-build.ps1 (preserved)" -ForegroundColor Gray
}

$destBashScript = Join-Path $scriptsDir "docker-build.sh"
if (-not (Test-Path $destBashScript)) {
    Copy-Item -Path (Join-Path $universalDir "docker-build.sh") -Destination $destBashScript -Force
    Write-Host "  + Created: scripts/docker-build.sh (Bash runner for Linux/macOS)" -ForegroundColor Green
} else {
    Write-Host "  = Existing: scripts/docker-build.sh (preserved)" -ForegroundColor Gray
}

# 8. Generate docs/DOCKER_GUIDE.md
$destGuide = Join-Path $docsDir "DOCKER_GUIDE.md"
if (-not (Test-Path $destGuide)) {
    $guideContent = @"
# Docker Workspace Guide ($detectedStack)

This repository is fully containerized and engineered to operate seamlessly across both local Docker engines and remote Docker daemons (e.g. Debian VM via SSH context).

---

## 1. Directory Organization

```
docker/
├── Dockerfile              # Multi-stage container definition
└── docker-compose.yml      # Development, CLI, and test services

scripts/
├── docker-build.ps1        # PowerShell runner (Windows)
└── docker-build.sh         # Bash runner (Linux / macOS / WSL)

docs/
└── DOCKER_GUIDE.md         # Operational documentation
```

---

## 2. Essential Commands

### Build Application Container:
Windows PowerShell:
```powershell
.\scripts\docker-build.ps1
```
Linux / macOS / Bash:
```bash
./scripts/docker-build.sh
```

### Run Tests Inside Container:
```powershell
.\scripts\docker-build.ps1 -RunTests
```

### Clean Rebuild:
```powershell
.\scripts\docker-build.ps1 -NoCache
```

### Start Interactive Development via Docker Compose:
```powershell
docker compose -f docker/docker-compose.yml up -d dev
```

---

## 3. Automated Image Cleanup
Dangling build layers are pruned automatically upon every build to keep Docker pristine without disk clutter.
"@
    Set-Content -Path $destGuide -Value $guideContent -Encoding UTF8
    Write-Host "  + Created: docs/DOCKER_GUIDE.md" -ForegroundColor Green
} else {
    Write-Host "  = Existing: docs/DOCKER_GUIDE.md (preserved)" -ForegroundColor Gray
}

Write-Host "`n[SUCCESS] Docker workspace configured cleanly in docker/, scripts/, and docs/!" -ForegroundColor Green
Write-Host "Run `.\scripts\docker-build.ps1` to test building your project container." -ForegroundColor Yellow

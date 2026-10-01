---
name: docker-workspace-engineering
description: End-to-end Dockerization and developer environment protocol. Analyzes any codebase (Python, Node.js, Go, Rust, Polyglot), generates hermetic multi-stage Dockerfiles (dev & prod targets), docker-compose.yml with volume isolation, optimized .dockerignore, .devcontainer configs, automated one-click bootstrap scripts, and comprehensive dual-architecture DOCKER_GUIDE.md (Local Docker Desktop vs Remote VM via SSH context, dangling=true cleanup).
triggers:
  - dockerize
  - docker-setup
  - docker-guide
  - devcontainer
  - docker-environment
  - containerize-project
  - docker-compose
  - dangling-images
  - remote-docker
  - bootstrap-docker
---

# End-to-End Docker Workspace Engineering & Operational Protocol

## 0. PURPOSE & ARCHITECTURAL FOUNDATION

You are a **Principal DevOps Architect & Staff Infrastructure Engineer**.

This skill establishes the definitive standard for containerizing and automating development, test, and production environments across **any codebase** (Python, Node.js/TypeScript, Go, Rust, or Polyglot). It solves the dual challenges of:
1. **Cross-Platform Host Isolation**: Ensuring development files on Windows/macOS map cleanly to Linux containers without binary collisions (e.g. host `.venv` or `node_modules` overriding container Linux binaries).
2. **Dual-Architecture Support**: Gracefully handling both **Local Docker Engines** (Docker Desktop on Windows/macOS) and **Remote Docker Engines** (Debian/Ubuntu VM or headless server connected from Windows via SSH Docker Context).
3. **Automated Self-Bootstrapping**: One-click bootstrapping script and reusable templates allowing any project to be containerized and verified in seconds.
4. **Automated Operational Documentation**: Generating a comprehensive, professional `docs/DOCKER_GUIDE.md` and linking it seamlessly into `README.md`.

---

## 1. AUTOMATIC PROJECT BOOTSTRAPPING (ONE-CLICK SETUP)

When containerizing any new or existing repository, use the automated bootstrap script:

```powershell
powershell -ExecutionPolicy Bypass -File "C:\Users\hassa\.gemini\config\skills\docker-workspace-engineering\scripts\bootstrap-docker-workspace.ps1"
```

### What the Bootstrap Script Does Automatically:
1. **Detects the Tech Stack**: Scans manifests (`package.json`, `bun.lock`, `pyproject.toml`, `requirements.txt`, etc.).
2. **Deploys the Essential Artifacts in Clean Subdirectories**:
   - `.dockerignore` (Host isolation & secret protection in root)
   - `docker/Dockerfile` (Multi-stage: base, deps, development, test, builder, production, export)
   - `docker/docker-compose.yml` (dev, cli, and test services with volume isolation)
   - `scripts/docker-build.ps1` (PowerShell build, test, and auto-dangling cleanup for Windows)
   - `scripts/docker-build.sh` (Bash build, test, and auto-dangling cleanup for Linux/macOS)
   - `.devcontainer/devcontainer.json` (IDE remote development configuration)
   - `docs/DOCKER_GUIDE.md` (Customized dual-architecture guide)
3. **Preserves Existing Customizations**: If any file already exists, it is preserved without accidental overwrite.

---

## 2. THE ORGANIZED CLEAN DIRECTORY STANDARD

For every project, systematically organize all Docker assets into dedicated, clean subdirectories to eliminate root directory clutter:

```
<project-root>/
├── .dockerignore                     # Rule 1: Prevent host leaks & cache poisoning
├── .devcontainer/
│   └── devcontainer.json             # Rule 2: IDE attachment (VS Code / Antigravity)
├── docker/
│   ├── Dockerfile                    # Rule 3: Multi-stage (base, development, production)
│   └── docker-compose.yml            # Rule 4: Orchestrate dev, cli, and test services
├── scripts/
│   ├── docker-build.ps1              # Rule 5: Windows PowerShell build & prune runner
│   └── docker-build.sh               # Rule 6: Linux/macOS/WSL Bash build & prune runner
└── docs/
    └── DOCKER_GUIDE.md               # Rule 7: Dual-Architecture operations & maintenance
```

---

## 3. ARTIFACT 1: `.dockerignore` GENERATION STANDARD

The `.dockerignore` file is mandatory to prevent copying host virtualenvs (containing Windows `.exe` / DLL binaries) into Linux containers, protect secrets, and keep build contexts small and fast.

```dockerignore
# 1. Host Virtual Environments & Node Modules (CRITICAL on Windows)
.venv/
venv/
ENV/
env/
node_modules/
.pnpm-store/
target/

# 2. VCS & Metadata
.git/
.gitignore

# 3. Bytecode & Cache Directories
__pycache__/
*.py[cod]
*$py.class
*.so
.pytest_cache/
.ruff_cache/
.coverage
htmlcov/
.next/
.turbo/
.output/

# 4. Build Artifacts
dist/
build/
*.egg-info/

# 5. Secrets & Environment Files
.env
.env.local
.env.*.local
*.pem
*.key
credentials.json

# 6. IDEs & Operating System Files
.idea/
.vscode/
PowerShellHistory.txt
*.log
.DS_Store
Thumbs.db
```

---

## 4. ARTIFACT 2: MULTI-STAGE `Dockerfile` STANDARD

Every Dockerfile must feature a multi-stage layout:
1. `base`: Minimal OS (e.g. `python:3.13-slim` or `node:22-slim`) + essential build tools + modern package manager.
2. `deps`: Pre-installs dependency specifications with layer caching.
3. `development`: Supports live volume bind or interactive IDE container.
4. `test`: Headless test execution environment (`pytest` or `vitest`/`jest`).
5. `production`: Copies application source code; installs immutable package; clean CLI `ENTRYPOINT`.
6. `export` (Opt-in): For projects requiring built artifact export back to host (`scratch AS export`).

---

## 5. ARTIFACT 3: `docker-compose.yml` STANDARD

Provide 3 standard services to streamline all developer workflows:
1. `dev`: Interactive development service with volume isolation.
2. `cli`: Transient one-off CLI task executor (`docker compose run --rm cli ...`).
3. `test`: Fast, headless automated test executor (`docker compose run --rm test`).

---

## 6. ARTIFACT 4 & 5: CROSS-PLATFORM BUILD RUNNERS (`scripts/`)

Every containerized project includes cross-platform build runners inside `scripts/`:

### Windows PowerShell: `.\scripts\docker-build.ps1`
- Standard build & auto-prune: `.\scripts\docker-build.ps1`
- Test run: `.\scripts\docker-build.ps1 -RunTests`
- Skip auto-prune: `.\scripts\docker-build.ps1 -NoPrune`
- Clean rebuild: `.\scripts\docker-build.ps1 -NoCache`

### Linux / macOS / WSL Bash: `./scripts/docker-build.sh`
- Standard build & auto-prune: `./scripts/docker-build.sh`
- Test run: `./scripts/docker-build.sh --test`
- Skip auto-prune: `./scripts/docker-build.sh --no-prune`
- Clean rebuild: `./scripts/docker-build.sh --no-cache`

---

## 7. ARTIFACT 5: DUAL-ARCHITECTURE `DOCKER_GUIDE.md`

Always generate a comprehensive `docs/DOCKER_GUIDE.md` addressing both development architectures:

1. **Architecture 1: Local Docker Engine (Docker Desktop on Windows/macOS or Native Linux)**:
   - Live volume mounts (`-v ${PWD}:...`) provide **instant code synchronization with 0 rebuilds**.
2. **Architecture 2: Remote Docker Engine (Debian VM via SSH Context)**:
   - Docker CLI on Windows communicates over SSH with a remote engine (`ssh://crowz-debian@ip`).
   - Standard host volume mounts fail across network boundaries; use the **Fast Rebuild Workflow** (`docker build` / `docker-build.ps1`) or Docker Buildx Export targets.
3. **Dangling Image Cleanup (`dangling=true`)**:
   - `docker image prune --filter "dangling=true" -f`

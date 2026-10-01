---
name: docker-containerization
description: Production-grade containerization and isolated runtime protocol. Enforces hermetic multi-stage builds (Python 3.12+, Node.js/Next.js), strict non-root execution (USER nonroot), minimal attack surface (distroless / slim), build-time secret protection, Docker Compose network isolation, cgroups resource bounds, and comprehensive healthchecks.
triggers:
  - docker
  - container
  - dockerfile
  - compose
  - docker-compose
  - containerization
  - multistage-build
  - distroless
  - cgroups
  - healthcheck
---

# Enterprise Containerization & Isolated Runtime Protocol

## 0. PURPOSE & ARCHITECTURAL FOUNDATION

You are a **Principal Systems Architect & Staff Container Security Engineer**.

This skill establishes the definitive, production-grade engineering standard for containerizing backend services, web applications, and worker nodes. In modern distributed architectures, **containerization is an immutable security boundary and isolated execution environment**, not merely a deployment packaging mechanism. A compromised or poorly architected container exposes the underlying host kernel, introduces lateral movement vectors, wastes cluster compute through unbounded memory leaks, and leaks sensitive credentials across build layers.

### Core Tenets:
1. **Hermetic Multi-Stage Builds**: Build tooling (compilers, build-essential, git, header files, package managers) must NEVER exist in production images. Build environments compile artifacts; runtime environments execute them with minimal dependencies.
2. **Strict Least-Privilege & Non-Root Execution**: Running as `root` (UID 0) inside a container is a zero-tolerance security blocker. Containers must execute under an unprivileged user (`nonroot`, UID/GID 10001:10001) with a locked shell, no sudo capabilities, and restricted filesystem permissions.
3. **Minimal Attack Surface**: Prefer Google Container Tools `distroless` or stripped `-slim` distributions over heavy full OS images. Strip extraneous shells, debug utilities, package managers, and binaries.
4. **Zero Build-Time Secret Leakage**: Secrets (API keys, private tokens, certificates) must NEVER be passed via `ENV`, `ARG`, or baked into image layers. Secrets must be mounted ephemerally using Docker BuildKit secret mounts (`--mount=type=secret`).
5. **Defense-in-Depth Runtime Isolation**: Containers must drop all Linux kernel capabilities (`cap_drop: [ALL]`), enforce `no-new-privileges`, run with read-only root filesystems (`read_only: true`), and allocate explicit memory and CPU quotas (cgroups limits).
6. **Multi-Tier Network Segmentation**: Internal databases, caches, and private message brokers must reside on isolated backend networks with `internal: true`. Only ingress gateways and reverse proxies expose ports externally.
7. **Deterministic Healthchecks & Graceful Teardown**: Every service must define an explicit `HEALTHCHECK` with calibrated intervals, timeouts, and start periods, accompanied by proper `STOPSIGNAL` handling and connection draining.

---

## 1. DOCKERFILE ENGINEERING & HERMETIC MULTI-STAGE BUILDS

Every Dockerfile must be structured around multi-stage builds that isolate dependencies, maximize layer cache reuse, and ensure runtime immutability.

### 1.1 Layer Caching Strategy & Manifest Segregation
Docker builds cache layers sequentially. Any change to a layer invalidates all subsequent layers:
- **Order of Operations**: Place slow-changing layers early (system packages, base dependencies) and fast-changing layers late (application source code).
- **Manifest-First Rule**: Copy package manifests (`pyproject.toml`, `poetry.lock`, `package.json`, `pnpm-lock.yaml`) and install dependencies *before* copying application source code.
- **Cache Mounts**: Leverage BuildKit cache mounts (`--mount=type=cache,target=...`) to avoid redownloading package wheels, npm tarballs, or apt indices across builds.

```dockerfile
# ANTI-PATTERN (Invalidates dependency cache on every single source edit):
COPY . /app
RUN pip install -r /app/requirements.txt

# CORRECT PATTERN (Dependency layer is cached independently of source code):
COPY pyproject.toml poetry.lock /app/
RUN --mount=type=cache,target=/root/.cache/pip pip install -r /app/requirements.txt
COPY src/ /app/src/
```

---

### 1.2 Python 3.12+ Production Multi-Stage Standard

The following template provides a production-grade, hardened Dockerfile for Python 3.12+ services (FastAPI, Flask, worker processes). It utilizes a compiler builder stage, an isolated virtual environment, non-root user execution, and an explicit healthcheck without relying on `curl` or external binaries.

```dockerfile
# syntax=docker/dockerfile:1.7
# Stage 1: Build & Dependency Resolution
FROM python:3.12-slim-bookworm AS builder

# Prevent Python from buffering stdout/stderr and writing .pyc files
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /build

# Install compilation toolchain needed for C-extensions/native wheels
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment for deterministic runtime isolation
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy dependency specifications first to maximize layer cache efficiency
COPY pyproject.toml requirements.txt ./

# Install dependencies into virtualenv utilizing BuildKit cache mounts
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --upgrade pip setuptools wheel && \
    pip install -r requirements.txt

# ------------------------------------------------------------------------------
# Stage 2: Hardened Production Runtime
FROM python:3.12-slim-bookworm AS runner

# Set runtime environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    PORT=8000

WORKDIR /app

# Create unprivileged system group and user with explicit UID/GID
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -M -s /sbin/nologin appuser

# Copy virtual environment and runtime libraries from builder
COPY --from=builder --chown=appuser:appgroup /opt/venv /opt/venv

# Copy application source code with unprivileged ownership
COPY --chown=appuser:appgroup src/ /app/src/

# Install minimal runtime system libraries (e.g. libpq for PostgreSQL) if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /tmp/* /var/tmp/*

# Drop all privileges
USER 10001:10001

# Expose documented application port
EXPOSE 8000

# Native Python socket healthcheck (eliminates curl/wget attack surface)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["python", "-c", "import urllib.request, os; sys_exit = 0 if urllib.request.urlopen('http://127.0.0.1:' + os.environ.get('PORT', '8000') + '/healthz', timeout=3).getcode() == 200 else 1; exit(sys_exit)"]

# Use exec form of ENTRYPOINT / CMD for immediate SIGTERM signal propagation
CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

### 1.3 Node.js & Next.js 15+ Production Multi-Stage Standard

The following template provides a production-grade, hardened Dockerfile for modern Node.js and Next.js applications using standalone output mode, non-root user execution, and stripped image footprint.

```dockerfile
# syntax=docker/dockerfile:1.7
# Stage 1: Dependency Installation
FROM node:22-alpine AS deps
WORKDIR /app

# Install native dependencies required for building node modules if necessary
RUN apk add --no-cache libc6-compat

# Copy lockfiles first
COPY package.json pnpm-lock.yaml* package-lock.json* yarn.lock* ./

# Install dependencies using corresponding package manager cache
RUN \
  if [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# ------------------------------------------------------------------------------
# Stage 2: Application Build & Asset Compilation
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set Next.js telemetry disable flag and production environment
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

# Compile application (requires output: 'standalone' in next.config.js)
RUN \
  if [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm run build; \
  elif [ -f package-lock.json ]; then npm run build; \
  elif [ -f yarn.lock ]; then yarn build; \
  else npm run build; \
  fi

# ------------------------------------------------------------------------------
# Stage 3: Minimal Production Runtime
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Create unprivileged non-root user and group
RUN addgroup --system --gid 10001 nodejs && \
    adduser --system --uid 10001 nextjs

# Copy static assets and public assets
COPY --from=builder /app/public ./public

# Set correct permissions for prerender cache and static files
RUN mkdir .next && chown nextjs:nodejs .next

# Copy standalone server and static files produced by Next.js build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Drop privileges
USER 10001:10001

EXPOSE 3000

# Native Node.js HTTP healthcheck without curl
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD ["node", "-e", "const http = require('http'); const req = http.request({ host: '127.0.0.1', port: process.env.PORT || 3000, path: '/api/health', timeout: 2000 }, (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }); req.on('error', () => process.exit(1)); req.end();"]

CMD ["node", "server.js"]
```

---

### 1.4 Strict `.dockerignore` Baseline Specification

An undisciplined build context leaks confidential `.env` credentials, inflates build latency, and invalidates caches. Every containerized repository must maintain a root `.dockerignore`:

```text
# Version Control & Git Internals
.git/
.gitignore
.gitattributes

# Environment Configurations & Secret Tokens (CRITICAL)
.env
.env.*
*.pem
*.key
*.cert
*.crt
id_rsa*
*.pfx

# Dependency Folders & Local Virtual Environments
node_modules/
.venv/
venv/
env/
__pycache__/
*.pyc
*.pyo
*.pyd

# Testing, Coverage & Build Artifacts
.coverage
htmlcov/
.pytest_cache/
.tox/
coverage/
dist/
build/
.next/
out/

# IDE, Editor & OS Artifacts
.idea/
.vscode/
*.swp
*.swo
.DS_Store
Thumbs.db

# Documentation & CI Pipelines
README.md
docs/
.github/
.gitlab-ci.yml
.agents/
```

---

## 2. CONTAINER HARDENING & DEFENSIVE SECURITY

Container isolation is not automatic. Default container configurations grant excessive Linux capabilities and allow root execution.

### 2.1 Least Privilege & Non-Root Execution (`USER nonroot`)
- **Prohibit Root Execution**: Running as root (UID 0) inside a container simplifies container escape exploits (e.g., CVE-2024-21626, kernel privilege escalation).
- **Explicit UID and GID**: Always specify numeric UIDs and GIDs (`USER 10001:10001`) rather than symbolic names. Kubernetes and container runtimes validate numeric IDs without querying container `/etc/passwd`.
- **Locked Shells**: Service users must be created with `/sbin/nologin` or `/bin/false` to prevent interactive shell spawning.

### 2.2 Attack Surface Minimization
- **Strip Compilers & Headers**: Never retain `gcc`, `clang`, `make`, `python-dev`, or `linux-headers` in the production runtime stage.
- **Distroless & Slim**: Use `distroless` (e.g., `gcr.io/distroless/python3-debian12`, `gcr.io/distroless/nodejs22-debian12`) or `-slim` Debian / Alpine images. Distroless images contain solely your application and runtime dependencies—no package manager (`apt`, `apk`), no interactive shell (`sh`, `bash`).
- **Eliminate Vulnerable Utilities**: Utilities like `curl`, `wget`, `nc`, `netcat`, and `tar` are prime vectors for remote code execution and lateral movement. Remove them or use language-native healthcheck probes.

### 2.3 BuildKit Secret Protection (`--mount=type=secret`)
Passing secrets through `ARG` or `ENV` bakes credentials directly into image layer metadata, viewable via `docker history` or image inspection.

```dockerfile
# ANTI-PATTERN: Secret is permanently baked into image metadata and layer history!
ARG GITHUB_TOKEN
RUN git clone https://${GITHUB_TOKEN}@github.com/company/private-repo.git

# ANTI-PATTERN: Environment variable persists in final image!
ENV NPM_TOKEN="secret-npm-token"
RUN npm install

# REQUIRED PATTERN: Ephemeral secret mount without layer persistence
# Mount is accessible exclusively during the execution of this single RUN command
RUN --mount=type=secret,id=npm_token \
    NPM_TOKEN=$(cat /run/secrets/npm_token) npm ci --ignore-scripts
```

Execute the build securely passing the secret from host environment or file:
```bash
docker build --secret id=npm_token,env=NPM_TOKEN -t my-app:prod .
```

### 2.4 Runtime Isolation: Read-Only Filesystems & Dropped Capabilities
In production orchestrators (Docker Compose or Kubernetes), enforce strict kernel sandboxing:
- **Read-Only Root Filesystem**: Set `read_only: true`. Any malware or unauthorized file modification fails immediately because the container root `/` is immutable.
- **Dedicated Tmpfs**: Provide writable in-memory mounts for `/tmp` and `/run` where temporary buffers are strictly required:
  ```yaml
  tmpfs:
    - /tmp:rw,noexec,nosuid,size=64m
    - /run:rw,noexec,nosuid,size=16m
  ```
- **Capability Dropping**: Drop all kernel capabilities (`cap_drop: [ALL]`). Add back only specifically audited capabilities (such as `NET_BIND_SERVICE` if binding privileged ports <1024, though unprivileged ports e.g. 8000/8080 are preferred).
- **No New Privileges**: Set `no-new-privileges:true` to prevent processes from gaining additional privileges via `setuid` or `setgid` binaries.

---

## 3. DOCKER COMPOSE ORCHESTRATION & NETWORK ISOLATION

Docker Compose configurations must define multi-tier segmented networks, resource quotas, and explicit lifecycle hooks.

### 3.1 Network Topology & Multi-Tier Segmentation (`internal: true`)
A single default network is a critical architectural flaw. Every service can communicate with every other service:
- **Frontend / Ingress Network**: Connects public-facing reverse proxies (Nginx, Traefik, Caddy) to the application API service.
- **Backend / Storage Network**: Isolated internal network (`internal: true`) connecting the application API service to databases (PostgreSQL, MySQL) and caches (Redis).
- **Isolation Guarantee**: The database and cache containers NEVER connect to the frontend network, have no external ports published, and cannot establish outbound connections to the internet.

```text
┌─────────────────┐
│ Ingress Gateway │ (80/443 exposed)
└────────┬────────┘
         │
    [frontend-net]
         │
┌────────┴────────┐
│ Application API │
└────────┬────────┘
         │
    [backend-net] (internal: true, no internet, no ingress access)
         │
┌────────┴────────┐
│ PostgreSQL / DB │ (No exposed ports to host!)
└─────────────────┘
```

---

### 3.2 Explicit Resource Constraints (cgroups Limits)
Unconstrained containers can trigger host kernel Out-Of-Memory (OOM) kills that terminate critical processes. Every Compose service must specify explicit CPU and memory bounds:

```yaml
deploy:
  resources:
    limits:
      cpus: '1.5'
      memory: 1024M
      pids: 100
    reservations:
      cpus: '0.25'
      memory: 256M
```
- `limits.memory`: Hard threshold. If exceeded, the container process is targeted by the OOM killer.
- `reservations.memory`: Guaranteed allocation reserved by the host scheduler.
- `limits.pids`: Process ID limit preventing fork bombs.

---

### 3.3 Production Compose Reference Architecture (`compose.yaml`)

```yaml
# Production Docker Compose Reference Architecture
name: production-platform

services:
  # Ingress Reverse Proxy
  proxy:
    image: caddy:2.8-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    networks:
      - public_ingress
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    deploy:
      resources:
        limits:
          cpus: '0.50'
          memory: 256M
        reservations:
          cpus: '0.10'
          memory: 64M

  # Backend API Application
  api:
    build:
      context: .
      dockerfile: Dockerfile
      target: runner
    restart: unless-stopped
    read_only: true
    user: "10001:10001"
    environment:
      PORT: "8000"
      DATABASE_URL_FILE: /run/secrets/db_password
    secrets:
      - db_password
    tmpfs:
      - /tmp:rw,noexec,nosuid,size=64m
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    networks:
      - public_ingress
      - private_storage
    depends_on:
      db:
        condition: service_healthy
    deploy:
      resources:
        limits:
          cpus: '2.00'
          memory: 1536M
          pids: 150
        reservations:
          cpus: '0.50'
          memory: 512M
    stop_grace_period: 30s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  # Database Tier (Completely Isolated)
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    read_only: true
    environment:
      POSTGRES_DB: production_db
      POSTGRES_USER: db_admin
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
      PGDATA: /var/lib/postgresql/data/pgdata
    secrets:
      - db_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    tmpfs:
      - /tmp:rw,noexec,nosuid,size=64m
      - /var/run/postgresql:rw,noexec,nosuid,size=16m
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
      - SETUID
      - SETGID
    networks:
      - private_storage
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U db_admin -d production_db"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 20s
    deploy:
      resources:
        limits:
          cpus: '2.00'
          memory: 2048M
        reservations:
          cpus: '0.50'
          memory: 512M

# Networks: Strict Tier Segmentation
networks:
  public_ingress:
    driver: bridge
  private_storage:
    driver: bridge
    internal: true  # Absolute isolation: No outbound internet, no external routing

# Volumes: Persistent Named Storage
volumes:
  postgres_data:
  caddy_data:
  caddy_config:

# Secrets: Externalized Secret Management
secrets:
  db_password:
    file: ./secrets/db_password.txt
```

---

## 4. HEALTHCHECKS, RESILIENCE & OBSERVABILITY

### 4.1 Orchestrator Healthcheck Specification
Containers must actively communicate their internal application readiness to the orchestrator:
- **Parameters**:
  - `interval`: Frequency of checks (typically `15s`–`30s`).
  - `timeout`: Maximum duration before check fails (typically `3s`–`5s`).
  - `start_period`: Bootstrap grace window during which failures do not increment failure counters (e.g. database migration or cache warmup).
  - `retries`: Consecutive failures required to transition container to `unhealthy`.
- **Zero-Tooling Probe Pattern**: When `curl` or `wget` are stripped from production images, execute native runtime language one-liners (Python `urllib.request` or Node.js `http.request`).

### 4.2 Graceful Shutdown Lifecycle (`STOPSIGNAL`)
When stopping or restarting containers:
1. Docker sends `SIGTERM` to PID 1 inside the container.
2. If PID 1 is a shell script (`sh -c ...`), the shell may swallow `SIGTERM` and fail to signal child processes.
3. **Mandatory Rule**: Use the **exec form** of `ENTRYPOINT` and `CMD`:
   ```dockerfile
   # ANTI-PATTERN (Shell form: PID 1 is /bin/sh, SIGTERM is swallowed):
   CMD uvicorn src.main:app --port 8000

   # CORRECT PATTERN (Exec form: uvicorn is PID 1, receives SIGTERM directly):
   CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
   ```
4. Set `stop_grace_period: 30s` (or appropriate interval) in Compose to allow active HTTP requests to drain before Docker sends `SIGKILL`.

### 4.3 Log Rotation Standard
Unbounded container logs fill host filesystems and crash nodes. Always enforce log rotation in Compose or Docker daemon:
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

---

## 5. CONTAINER AUDIT & VERIFICATION CHECKLIST

Before approving any Dockerfile or Compose configuration, verify every gate:

| Category | Verification Gate | Violation Severity |
| :--- | :--- | :--- |
| **Security** | Container runs as non-root user (`USER nonroot` or explicit UID) | **HARD BLOCKER (Reject)** |
| **Security** | Zero secrets in `ARG`, `ENV`, or committed files | **HARD BLOCKER (Reject)** |
| **Security** | Root filesystem is read-only (`read_only: true`) with tmpfs | **MEDIUM** |
| **Security** | Linux capabilities dropped (`cap_drop: [ALL]`) | **HIGH** |
| **Build** | Multi-stage build separates build tools from runtime | **HARD BLOCKER (Reject)** |
| **Build** | Manifests copied before source code for layer caching | **HIGH** |
| **Build** | Comprehensive `.dockerignore` prevents credential/context leakage | **HARD BLOCKER (Reject)** |
| **Network** | Database/Storage tier resides on `internal: true` network | **HIGH** |
| **Network** | Database ports are NOT published to the host machine | **HARD BLOCKER (Reject)** |
| **Resources**| Explicit CPU and memory limits set on every service | **HIGH** |
| **Reliability**| Deterministic `HEALTHCHECK` configured with `start_period` | **HIGH** |
| **Lifecycle**| Exec form `["cmd", "arg"]` used for CMD/ENTRYPOINT | **HIGH** |

### Automated Linting & Scanning Commands
```bash
# Lint Dockerfile for structural best practices
hadolint Dockerfile

# Scan image for CVE vulnerabilities and exposed secrets
trivy image my-app:prod

# Inspect container runtime privileges and users
docker inspect --format 'User: {{.Config.User}}' my-app:prod
docker inspect --format 'Health: {{json .State.Health}}' $(docker compose ps -q api)
```

# 🔀 Proxy Redirector — High-Performance Proxy Management & Free VPN

<div align="center">

[![CI Build & Verification](https://github.com/crrrowz/Proxy_redirector/actions/workflows/ci.yml/badge.svg)](https://github.com/crrrowz/Proxy_redirector/actions/workflows/ci.yml)
[![Go Version](https://img.shields.io/badge/Go-1.22%2B-00ADD8?style=flat&logo=go)](https://go.dev/)
[![Node Version](https://img.shields.io/badge/Node.js-20%2B-339933?style=flat&logo=nodedotjs)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)](https://react.dev/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL%20Mode-003B57?style=flat&logo=sqlite)](https://www.sqlite.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?style=flat&logo=redis)](https://redis.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**A production-grade, self-healing proxy management and routing platform with integrated ad blocking, sub-second failover, dynamic Surge rotation, dual desktop/CLI clients, and an enterprise Node.js SaaS cloud orchestrator.**

[Quick Start](#-quick-start) • [Architecture](#-system-architecture) • [CLI Usage](#-headless-cli-usage-proxy-cli) • [Cloud SaaS](#-enterprise-cloud-saas-platform) • [Documentation](#-documentation-index) • [Contributing](#-contributing)

</div>

---

## ✨ System Highlights

- ⚡ **Ultra-Fast Go Daemon (`/engine`)** — Core engine with concurrent multi-threaded proxy health checking, latency measurement, anonymity classification (Transparent vs. Anonymous vs. Elite), and SSL certificate verification.
- 🔄 **Dynamic Surge Rotation** — Rotate IP addresses per request, timed intervals, or lowest latency with **zero connection leakage** (in-flight TCP sessions finish cleanly on prior proxy).
- 🛡️ **Embedded Ad & Tracker Blocker** — Intercepts advertising networks, tracking pixels, malware, and telemetry at the socket level with wildcard pattern support and category toggles.
- 🖥️ **Dual Client Interfaces (`/client`)**:
  - **Wails Desktop GUI**: Sleek, native dark-theme desktop application with system tray and real-time monitoring.
  - **Headless CLI (`proxy-cli`)**: Standalone Cobra CLI binary for headless Linux/Windows servers, cron jobs, and terminal workflows.
  - **Shared Client Core (`client/internal/core`)**: 100% unified business logic between GUI and CLI.
- 🔌 **Local Dual Relays** — SOCKS5 server (`:1080`) and HTTP CONNECT proxy (`:8080`) with automatic LAN device bypass (`192.168.x.x`, `127.0.0.1`).
- 📊 **Historical Analytics Engine** — Permanent profiling engine calculates lifetime uptime %, true average latency, reliability scores (0-100), and auto-tags (`fast`, `stable`, `failing`).
- 🌐 **Embedded Web Dashboard (`:9090`)** — Full-featured, responsive 6-tab glassmorphic operational web dashboard served directly by the Go engine.
- ☁️ **Enterprise Cloud SaaS (`/saas`)** — Complete **Node.js 20+ / TypeScript** platform engineered with Clean Hexagonal Architecture, Prisma ORM (PostgreSQL/Supabase), Redis token caches, Stripe billing, and a dedicated 1:1 static residential/datacenter IP mesh.

---

## 🏛️ System Architecture

The ecosystem follows a clean, three-tier hexagonal architecture:

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        TIER 1: HIGH-PERFORMANCE GO ENGINE & DUAL CLIENTS               │
│                                                                                        │
│   ┌───────────────────────────┐                      ┌──────────────────────────────┐  │
│   │  GUI Client (Wails/React) │                      │ Headless CLI (`proxy-cli`)   │  │
│   └─────────────┬─────────────┘                      └──────────────┬───────────────┘  │
│                 │                                                   │                  │
│                 └─────────────────────┬─────────────────────────────┘                  │
│                                       ▼                                                │
│                     ┌───────────────────────────────────┐                              │
│                     │     Client Core (client/core)     │                              │
│                     │ - Local SOCKS5 Proxy (:1080)      │                              │
│                     │ - Local HTTP Proxy (:8080)        │                              │
│                     │ - LAN Whitelist & Usage Tracker   │                              │
│                     └─────────────────┬─────────────────┘                              │
│                                       │ gRPC (:50051)                                  │
│   ┌───────────────────────────────────▼────────────────────────────────────────────┐   │
│   │                     Go Proxy Engine Daemon (engine/cmd)                        │   │
│   │  - Async Proxy Checker   - Surge Dynamic Rotator   - AdBlock & Tracker Engine  │   │
│   │  - Failover Handler      - Analytics Engine        - SQLite WAL Database       │   │
│   └───────────────────────────────────┬────────────────────────────────────────────┘   │
└───────────────────────────────────────┼────────────────────────────────────────────────┘
                                        │
┌───────────────────────────────────────┼────────────────────────────────────────────────┐
│  TIER 2: RICH EMBEDDED DASHBOARD      │    TIER 3: CLOUD SAAS PLATFORM (Node.js)       │
│  (engine/static - Port :9090)         │    (saas/ - Express/Fastify + TypeScript)      │
│                                       │                                                │
│  - 6-Tab Real-time Glassmorphic UI    │    - Multi-tenant User Accounts & Auth (JWT)   │
│  - Active Proxy & Gateway Telemetry   │    - Stripe Billing, Tiers & Invoicing         │
│  - Interactive AdBlock Rules/Lists    │    - Dedicated Static IP Lease Orchestrator    │
│  - Historical Proxy Leaderboard       │    - Prisma PostgreSQL (Supabase) + Redis      │
│  - Live Engine Config Controller      │    - RFC 7807 Standard Error Contracts         │
└───────────────────────────────────────┴────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Go 1.22+** (for Engine & CLI)
- **Node.js 20 LTS+** & **npm 10+** (for SaaS & Web Portal)
- **Docker & Docker Compose** (for PostgreSQL, Redis, and Supabase)

### 2. Running the Go Proxy Engine
```powershell
# Run Engine Daemon in development mode
go run ./engine/cmd/engine

# Access the embedded Web Dashboard in your browser:
# http://localhost:9090
```

### 3. Building All Binaries (Windows / Linux)
```powershell
# Run the automated build script
.\scripts\build_all.ps1

# Outputs:
# - Engine:  engine\build\engine.exe
# - CLI:     client\build\proxy-cli.exe
# - GUI:     client\build\bin\ProxyRedirector.exe
```

---

## 💻 Headless CLI Usage (`proxy-cli`)

The standalone CLI binary communicates directly with the engine and client core:

```bash
# Start local proxy relays with country filter and Surge mode
proxy-cli start --country US --surge --surge-interval 30

# Inspect live status, active proxy, and connected LAN devices
proxy-cli status

# Output status as JSON (ideal for scripting and CI/CD)
proxy-cli status --json

# Trigger an immediate proxy failover or rotation
proxy-cli rotate --force

# List alive proxies filtered by country
proxy-cli pool --country DE --limit 20

# Check if a domain is blocked by the AdBlock engine
proxy-cli adblock --check doubleclick.net

# Update engine parameters dynamically
proxy-cli config --set MaxSpeedMs=2500
```

---

## ☁️ Enterprise Cloud SaaS Platform

The `/saas` directory houses the enterprise Node.js backend built with **Clean Architecture**:

```bash
cd saas

# 1. Start Supabase (Postgres 16, Studio, Redis) in Docker
docker-compose -f docker-compose.supabase.yml up -d

# 2. Install dependencies & generate Prisma client
npm install
npx prisma generate

# 3. Seed default subscription plans and admin credentials
npm run prisma:seed

# 4. Start SaaS API server in development mode
npm run dev
# Server running on http://localhost:4000
# Supabase Studio running on http://localhost:8000
```

### REST API v1 Endpoint Overview:
- `POST /api/v1/auth/register` & `POST /api/v1/auth/login` — JWT Auth with device fingerprinting.
- `POST /api/v1/billing/checkout` — Stripe checkout session integration.
- `POST /api/v1/proxies/connect` — Relay discovery and session token issuance.
- `GET  /api/v1/proxies/static` — Dedicated static IP allocation.
- `POST /api/v1/relays/heartbeat` — Node telemetry and load balancing.
- `GET  /api/v1/admin/overview` — Platform fleet management.

---

## 🗺️ Documentation Index

| Document | Purpose |
| :--- | :--- |
| **[AI Agent Protocol](docs/AI_AGENT_WORKFLOW.md)** | Step-by-step SOP for AI coding agents (Graft, Docker, Go, Node.js). |
| **[Master Architecture](docs/architecture/ARCHITECTURE.md)** | Authoritative system architecture, data flow, and structural invariants. |
| **[Master Plan](docs/plans/MASTER_PLAN.md)** | Master engineering decomposition plan and legacy parity matrix. |
| **[Progress History](docs/reports/PROGRESS.md)** | Milestone execution history and verification records. |
| **[Roadmap](docs/plans/ROADMAP_NEXT_PHASE.md)** | Future roadmap (Supabase, VPS Mesh, Web Portal). |
| **[CONTRIBUTING.md](CONTRIBUTING.md)** | Contributor guidelines, testing standards, and git workflows. |
| **[SECURITY.md](SECURITY.md)** | Vulnerability disclosure policy and security architecture guarantees. |
| **[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)** | Community standards and Contributor Covenant 2.1. |
| **[SUPPORT.md](SUPPORT.md)** | Help channels, bug triage, and feature request routing. |
| **[GOVERNANCE.md](GOVERNANCE.md)** | Decision-making process, roles, and release authorities. |
| **[MAINTAINERS.md](MAINTAINERS.md)** | Maintainer details (Hassanein Hassan Alkahafji - [@crrrowz](https://github.com/crrrowz)) and code ownership matrix. |
| **[docs/README.md](docs/README.md)** | Technical documentation index for engine, client, and architecture. |
| **[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** | Diagnostic guide for port conflicts, proxy reachability, and SQLite locks. |
| **[docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)** | Self-hosted Supabase Docker deployment guide. |
| **[docs/RELAY_DEPLOYMENT_GUIDE.md](docs/RELAY_DEPLOYMENT_GUIDE.md)** | Automated VPS relay provisioning playbook. |
| **[saas/README.md](saas/README.md)** | Complete Node.js SaaS platform documentation. |

---

## 🧪 Testing & Verification

The project enforces hermetic, deterministic automated testing across all modules:

```bash
# 1. Test Go Engine Subsystems
cd engine
go test -v -race ./...

# 2. Test Go Client Core & Mocks
cd ../client
go test -v -race ./...

# 3. Test Node.js SaaS Platform
cd ../saas
npm test
```

All Pull Requests are automatically verified via GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) across Ubuntu and Windows runners.

---

## 🤝 Contributing

We welcome contributions from the open-source community! Please review our [**Contributing Guide**](CONTRIBUTING.md) and [**Code of Conduct**](CODE_OF_CONDUCT.md) before submitting Pull Requests.

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

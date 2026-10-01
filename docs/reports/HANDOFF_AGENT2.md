# 📋 Implementation Handoff Contract for Agent 2 (Implementer)

**Document ID**: `HANDOFF_AGENT2.md`  
**Author**: Principal Systems Architect (Agent 1)  
**Target Agent**: Agent 2 (Senior Software Engineer & Implementer)  
**Status**: `MANDATORY ENGINEERING CONTRACT`  
**Language Rule**: 100% English across all files, tests, configs, commits, and comments  

---

## 1. Inventory of What Already Exists

| Component / Subsystem | Path | State | Verification Status |
| :--- | :--- | :--- | :--- |
| **Go Engine Core** | `engine/` | Complete & Unit Tested | 🟢 `go test ./engine/...` PASS |
| **Go Client Core** | `client/internal/core/` | Extracted & Unit Tested | 🟢 `go test ./client/...` PASS |
| **Headless CLI** | `client/cmd/cli/` | Built (`proxy-cli`) | 🟢 Builds & executes subcommands |
| **Wails Desktop GUI** | `client/` | Configured | 🟢 Compiles with Wails v2 |
| **Embedded Web UI** | `engine/static/` | 6-Tab Dashboard | 🟢 Embedded in `embed.go` |
| **Node.js SaaS Backend**| `saas/` | Clean Architecture v1 | 🟢 `npm run build` & `npm test` PASS |
| **Prisma PostgreSQL Schema**| `saas/prisma/` | Generated Client | 🟢 Prisma Client v6 generated |
| **Protobuf RPC Contract** | `proto/engine/v1/` | Defined | 🟢 Go bindings in `shared/pb` |

---

## 2. Invariant: What Must Remain UNCHANGED

Agent 2 is **STRICTLY PROHIBITED** from altering or redesigning the following core architectural foundations:

1. **`go.work` Multi-Module Workspace Structure**:
   - Do NOT collapse `engine/`, `client/`, and `shared/` into a single root module or move them back into subfolders.
2. **`client/internal/core` Single-Source-of-Truth Rule**:
   - Business logic for proxy connections, Surge rotation, and status querying must live in `client/internal/core/`. Neither the Wails GUI (`app.go`) nor the CLI (`client/cmd/cli`) is permitted to duplicate connection logic.
3. **Hexagonal Architecture in `saas/`**:
   - Domain layer (`saas/src/core/domain`) must have zero imports from Express, Prisma, or external web frameworks.
   - Controllers must interact with repositories via interfaces in `saas/src/core/ports/`.
4. **Protobuf Signatures in `proto/engine/v1/engine.proto`**:
   - Do NOT break existing gRPC method numbers or parameter types. All updates must be backward-compatible.
5. **SQLite WAL Mode Guarantee**:
   - Database operations in `engine/internal/database/sqlite.go` must maintain single-writer concurrency with WAL mode and `_busy_timeout=5000`.

---

## 3. What Must Be Improved

1. **SaaS Integration Test Suite**:
   - Expand `saas/tests/` to include mock HTTP route testing (Supertest) covering `/api/v1/auth`, `/api/v1/billing`, and `/api/v1/proxies`.
2. **Realtime Telemetry in Embedded Web UI**:
   - Add Server-Sent Events (SSE) or WebSocket push for live packet transfer charts in `engine/static/app.js` as an upgrade over 2.5s polling.
3. **Structured Error Codes in Engine REST API**:
   - Align `engine/internal/server/rest_api.go` error responses to follow the RFC 7807 problem details pattern used by the SaaS backend.

---

## 4. What Must Be Implemented (Task Backlog for Agent 2)

### Task Block A: Self-Hosted Supabase Docker Stack & Database Seeding
* **Files to create/modify**:
  - `saas/docker-compose.supabase.yml` (Complete Supabase stack: Postgres 16, Studio, GoTrue, PostgREST, Kong).
  - `saas/prisma/seed.ts` (Seeder for subscription plans `Free`, `Basic`, `Pro`, `Business`, admin account, and static proxies).
  - Add npm script `"prisma:seed": "tsx prisma/seed.ts"` to `saas/package.json`.

### Task Block B: VPS Relay Automated Deployment Script
* **Files to create/modify**:
  - `scripts/deploy_relay.sh` (Shell script for Ubuntu 22.04/24.04 LTS to install Dante, configure TLS, and register with SaaS `/api/v1/relays/heartbeat`).
  - `scripts/deploy_relay.ps1` (PowerShell equivalent for Windows Server nodes).

### Task Block C: SaaS Client Portal & Web Dashboard (Next.js / React)
* **Files to create/modify**:
  - `saas/frontend/` (Modern Next.js or React 18 / Vite / Tailwind CSS portal connecting to `saas/src/app.ts`).
  - Implement login/register forms, subscription plan selection with Stripe checkout, and static proxy lease picker.

---

## 5. What Must Be Tested

1. **Go Core Regression Suite**:
   ```bash
   go test ./engine/... -v
   go test ./client/... -v
   ```
2. **Node.js SaaS Suite**:
   ```bash
   cd saas
   npm test
   npm run build
   ```
3. **End-to-End CLI Connection Test**:
   ```powershell
   ./scripts/build_cli.ps1
   ./client/build/proxy-cli.exe --help
   ```

---

## 6. What Must Be Documented

1. **Supabase Local Setup Guide** in `docs/SUPABASE_SETUP.md`.
2. **Relay Node Deployment Playbook** in `docs/RELAY_DEPLOYMENT_GUIDE.md`.
3. **OpenAPI 3.1 Swagger Specification** exported from `saas/` routes.

---

## 7. Explicit Permissions Matrix for Agent 2

| Area | Agent 2 Allowed to Modify? | Conditions / Guidelines |
| :--- | :---: | :--- |
| `saas/src/core/use-cases/` | **YES** | Add new business use cases following ports/adapters. |
| `saas/src/modules/` | **YES** | Add new controller routes and schemas. |
| `saas/prisma/seed.ts` | **YES** | Implement and execute database seed logic. |
| `scripts/deploy_relay.sh` | **YES** | Create automated Linux VPS deployment script. |
| `saas/frontend/` | **YES** | Create Next.js / React client web portal. |
| `client/internal/core/` | **EXTEND ONLY** | Can add methods, but MUST NOT break existing signatures. |
| `go.work` & root layout | **NO** | Must remain untouched in root directory. |
| `proto/engine/v1/` | **NO** | Breaking changes forbidden; additive fields allowed. |
| Legacy Python Code | **NO** | Python code is decommissioned; do NOT re-introduce Python. |

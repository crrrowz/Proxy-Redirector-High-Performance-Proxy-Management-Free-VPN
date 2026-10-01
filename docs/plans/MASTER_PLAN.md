# Comprehensive System Unification & Evolution Architecture Plan (A to Z)

**Task ID**: `TASK-PROXY-UNIFICATION-V3`  
**Status**: `APPROVED`  
**Architect**: System Architecture Specialist  
**Target Systems**: `Proxy_redirector` (Legacy Python) ➔ `proxy-redirector-v3` (Unified Go Engine + Dual GUI/CLI Client)  
**Primary Standard**: RFC-Compliant Architectural Decomposition & Zero-Regression System Consolidation  

---

## 1. Executive Summary & Problem Context

### 1.1 Context
The existing repository contains two parallel generations:
1. **Legacy Python Stack (`/core`, `/servers`, `/gui`, `/utils`)**: A Python 3.10+ implementation using `aiohttp`, `python-socks`, `pywebview`, and JSON flat-file storage (`data/*.json`). It features proxy checking, heuristic failover, adblocking, request traffic logging, and a pywebview dashboard.
2. **Next-Gen Go Stack (`/proxy-redirector-v3`)**: A multi-module Go 1.22+ workspace (`engine/`, `client/`, `shared/`, `proto/`) with Wails v2 (React/TS), SQLite with WAL mode, gRPC/Protobuf IPC, dynamic rotation ("Surge Mode"), and separated client core logic.

### 1.2 Core Objective
Unify 100% of the functional capabilities of the legacy Python version into the high-performance Go v3 architecture, implement the dedicated headless CLI client alongside the Wails desktop GUI, verify zero behavioral or feature regressions, and safely decommission/delete the legacy Python code.

### 1.3 Unified Three-Tier System Topology

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
│  (engine/static - Port 9090)          │    (saas/ - Express/Fastify + TypeScript)      │
│                                       │                                                │
│  - 6-Tab Full Parity Dashboard        │    - Multi-tenant User Accounts & Auth (JWT)   │
│  - Real-time Connection Metrics       │    - Stripe Billing, Tiers & Invoicing         │
│  - Continuous Discovery & Fetch View  │    - Cloud Relay Fleet Management              │
│  - Interactive AdBlock Rules & Lists  │    - PostgreSQL (Prisma) + Redis Token Cache   │
│  - Historical Analytics Leaderboard   │    - Central Usage Aggregation & Quota Limiter │
│  - Live Config Form (engine_config)   │    - Enterprise Admin Portal & Telemetry       │
└───────────────────────────────────────┴────────────────────────────────────────────────┘
```

---

## 2. Comprehensive Legacy-to-V3 Capability Parity Matrix

To ensure zero capability loss when retiring the Python version, every subsystem is mapped below:

| Subsystem / Feature | Legacy Python (`/core`, `/servers`) | Go v3 Current State (`/proxy-redirector-v3`) | Target Architecture Action |
| :--- | :--- | :--- | :--- |
| **Proxy Checking** | `proxy_checker.py` (asyncio, anonymity check, latency, geoip) | `engine/internal/proxy/checker.go` (Go worker pool, SSL verify, latency) | **Enrich Go Checker**: Port exact anonymity level classifications (Transparent vs Anonymous vs Elite) and geo-lookup. |
| **Pool Management** | `proxy_manager.py` (JSON loading, sorting, active proxy lock) | `engine/internal/proxy/manager.go` (Thread-safe pool, SQLite persistence) | **Feature Parity Complete**: Verify stickiness bonus (+1000) and multi-criteria sorting. |
| **Failover System** | `failover_handler.py` (circuit breaker, 2nd chance cooldown) | `engine/internal/failover/handler.go` (Max failures, exponential backoff) | **Audit & Align**: Verify second-chance retry timer logic and auto-recovery. |
| **Surge Rotation** | Basic random switch on fail | `engine/internal/proxy/rotator.go` (Surge mode, interval/request rotation) | **Supercedes Legacy**: Go implementation is strictly superior. |
| **Ad & Tracker Blocker**| `adblock_manager.py` (50+ domains, wildcard matching, categories) | `engine/internal/adblock/engine.go` (Trie/Map matching, stats, toggle) | **Enrich Categories**: Ensure all categories (`ads`, `tracking`, `malware`, `custom`) and wildcard rules are loaded. |
| **Analytics Engine** | `proxy_analytics.py` (hourly uptime, daily avg speed, scoring) | `engine/internal/proxy/analytics.go` (Score 0-100, auto-tags) | **Enrich Go Analytics**: Add hourly/daily bucket storage in SQLite for long-term historical charts. |
| **Traffic Logger** | `utils/traffic_logger.py` (in-memory ring buffer + JSON export) | `client/internal/tracker/tracker.go` (Bandwidth & request count) | **Extend Tracker**: Add detailed request log buffer (domain, status, latency) exposed via gRPC/REST. |
| **SOCKS5 Server** | `servers/socks5_server.py` (auth, LAN whitelist, adblock) | `client/internal/proxy/socks5.go` (Go SOCKS5 server) | **Add Local Subnet Whitelist**: Implement automatic whitelist bypass for LAN IPs (`192.168.x.x`, `10.x.x.x`, `127.0.0.1`). |
| **HTTP Proxy Server**| `servers/http_proxy_server.py` (CONNECT tunnel, HTTP relay) | `client/internal/proxy/http_proxy.go` + `http_connect.go` | **Complete**: Handles both CONNECT tunneling and raw HTTP proxying. |
| **GUI Dashboard** | `gui/launcher.py` + HTML/JS/CSS (pywebview) | `client/` Wails v2 + React 18 + Tailwind/Lucide | **Supercedes Legacy**: Native Wails desktop UI with unified design system. |
| **CLI Client** | None (Single monolithic CLI launcher) | Not yet implemented (Planned as Epic 2) | **Build Native Go CLI**: Standalone binary `proxy-cli` using `cobra` that connects to `client/internal/core`. |
| **Storage Engine** | Flat JSON files in `data/` | SQLite with WAL mode (`engine/internal/database/sqlite.go`) | **Data Migration Script**: Create automatic JSON ➔ SQLite import tool. |

---

## 3. Detailed Subsystem Specifications

### 3.1 Subsystem A: Engine Persistence & Data Migration
* **Path**: `proxy-redirector-v3/engine/internal/database/`
* **Schema Contract**:
  - `proxies`: `id`, `ip`, `port`, `protocol`, `country`, `city`, `username`, `password`, `anonymity`, `created_at`
  - `proxy_metrics`: `proxy_id`, `score`, `response_time_ms`, `total_checks`, `total_successes`, `consecutive_failures`, `last_alive`, `tags`
  - `hourly_analytics`: `proxy_id`, `date_hour`, `checks_count`, `success_count`, `avg_latency`
  - `adblock_rules`: `domain_or_pattern`, `category`, `is_regex`, `enabled`, `created_at`
  - `traffic_logs`: `id`, `timestamp`, `client_ip`, `target_host`, `protocol`, `bytes_transferred`, `status`, `blocked_by_adblock`

### 3.2 Subsystem B: Proxy Checker & Anonymity Classification
* **Path**: `proxy-redirector-v3/engine/internal/proxy/checker.go`
* **Anonymity Detection Algorithm**:
  1. Make request to public IP reflection endpoint (e.g., `https://api.ipify.org?format=json` or Cloudflare trace).
  2. Inspect response headers for `Via`, `X-Forwarded-For`, `X-Real-IP`.
  3. Classify:
     - **Transparent**: User's real IP is exposed in headers.
     - **Anonymous**: Real IP is hidden, but proxy headers indicate proxy presence.
     - **Elite**: Real IP is hidden and no proxy headers are detected.

### 3.3 Subsystem C: Headless CLI Client (`proxy-cli`)
* **Path**: `proxy-redirector-v3/cmd/cli/` (or `client/cmd/cli/`)
* **Architecture**: Standalone Go binary using `github.com/spf13/cobra`.
* **Commands**:
  - `proxy-cli start [--socks-port 1080] [--http-port 8080] [--country US] [--surge]`
  - `proxy-cli stop`
  - `proxy-cli status [--json]`
  - `proxy-cli rotate [--force]`
  - `proxy-cli pool list [--alive-only] [--sort speed|score]`
  - `proxy-cli adblock status|toggle|add <domain>|remove <domain>`
  - `proxy-cli config get|set <key> <value>`

### 3.4 Subsystem D: LAN Subnet Whitelist & Local Bypass
* **Path**: `proxy-redirector-v3/client/internal/proxy/`
* **Invariant**: When authentication is enabled on local SOCKS5/HTTP servers, connections originating from loopback (`127.0.0.1`, `::1`) or private RFC-1918 subnets (`192.168.0.0/16`, `10.0.0.0/8`, `172.16.0.0/12`) can optionally bypass authentication if configured in `engine_config.json`.

---

## 4. Directed Acyclic Component Dependency Graph (DAG)

```text
               ┌──────────────────────────────┐
               │    shared/models & shared/pb │  (Zero dependencies)
               └──────────────┬───────────────┘
                              │
               ┌──────────────▼───────────────┐
               │   shared/utils & metadata    │
               └──────────────┬───────────────┘
                              │
        ┌─────────────────────┴─────────────────────┐
        ▼                                           ▼
┌───────────────────────────┐         ┌───────────────────────────┐
│ engine/internal/database  │         │ client/internal/tracker   │
└─────────────┬─────────────┘         └─────────────┬─────────────┘
              │                                     │
┌─────────────▼─────────────┐         ┌─────────────▼─────────────┐
│ engine/internal/proxy     │         │ client/internal/proxy     │
│ (checker, manager, surge) │         │ (socks5, http_proxy)      │
└─────────────┬─────────────┘         └─────────────┬─────────────┘
              │                                     │
┌─────────────▼─────────────┐         ┌─────────────▼─────────────┐
│ engine/internal/server    │         │ client/internal/core      │
│ (gRPC server, REST API)   │         │ (unified business logic)  │
└─────────────┬─────────────┘         └─────────────┬─────────────┘
              │                                     │
              ▼                                     ▼
┌───────────────────────────┐         ┌───────────────────────────┐
│ engine/cmd/engine         │         │ client/app.go (Wails GUI) │
│ (Engine Service Daemon)   │         │ client/cmd/cli (CLI Tool) │
└───────────────────────────┘         └───────────────────────────┘
```

---

## 5. Structural Invariants & Safety Properties

1. **`INV-01: Single Source of Core Logic`**: GUI and CLI clients must share `client/internal/core` verbatim. Neither UI layer is permitted to implement independent proxying, rotation, or gRPC communication logic.
2. **`INV-02: Zero-Leak Rotation`**: When Surge Mode switches proxies, in-flight TCP sessions must complete gracefully on the prior connection while all new connection handshakes immediately target the newly elected proxy.
3. **`INV-03: Thread-Safe State Isolation`**: All mutations to the proxy pool, adblock rule trie, and rotation ring buffers must be protected by read/write mutexes (`sync.RWMutex`) or atomic pointers.
4. **`INV-04: Non-Blocking AdBlock Evaluation`**: Domain filtering must execute in sub-millisecond time ($O(k)$ where $k$ is domain depth) using exact-match maps and compiled trie/regex nodes.
5. **`INV-05: Atomic Configuration Updates`**: Configuration changes written to disk (`engine_config.json` / SQLite) must be written via temp file rename to prevent file corruption upon sudden power interruption.

---

## 6. Phased Implementation Sequence

### Phase 1: Legacy Feature Extraction & Engine Enhancement
* **Objective**: Enrich Go Engine with missing legacy features (Anonymity classification, detailed hourly/daily analytics, LAN subnet whitelist).
* **Target Files**:
  - `proxy-redirector-v3/engine/internal/proxy/checker.go`
  - `proxy-redirector-v3/engine/internal/proxy/analytics.go`
  - `proxy-redirector-v3/engine/internal/database/sqlite.go`
  - `proxy-redirector-v3/client/internal/proxy/socks5.go`
* **Verification Command**:
  ```powershell
  go test ./engine/internal/proxy/... -v
  go test ./engine/internal/database/... -v
  ```

### Phase 2: Native Headless CLI Client (`proxy-cli`)
* **Objective**: Build the CLI binary using Cobra that communicates with `client/internal/core`.
* **Target Files**:
  - Create `proxy-redirector-v3/client/cmd/cli/main.go`
  - Create `proxy-redirector-v3/client/cmd/cli/commands/*.go` (`start.go`, `stop.go`, `status.go`, `rotate.go`, `pool.go`, `adblock.go`)
* **Verification Command**:
  ```powershell
  go build -o ./bin/proxy-cli.exe ./client/cmd/cli
  ./bin/proxy-cli.exe --help
  ```

### Phase 3: Legacy Data Importer & Compatibility Layer
* **Objective**: Provide automatic migration tool to read legacy `data/data.json`, `data/analytics.json`, `data/blocklist.json` into SQLite database.
* **Target Files**:
  - Create `proxy-redirector-v3/engine/internal/database/importer.go`
  - Create `proxy-redirector-v3/engine/internal/database/importer_test.go`
* **Verification Command**:
  ```powershell
  go test ./engine/internal/database/ -run TestLegacyImport -v
  ```

### Phase 4: Full System E2E Verification & Integration Testing
* **Objective**: Run complete test matrix across SOCKS5, HTTP, AdBlock, Failover, Surge Rotation, GUI, and CLI.
* **Target Files**:
  - `proxy-redirector-v3/client/tests/integration_test.go`
* **Verification Command**:
  ```powershell
  go test ./client/tests/... -v
  ```

### Phase 5: Build Scripts & Distribution Packaging
* **Objective**: Consolidate unified build scripts to produce production binaries for Engine, Wails GUI, and CLI for Windows and Linux.
* **Target Files**:
  - `proxy-redirector-v3/scripts/build_all.ps1`
  - `proxy-redirector-v3/scripts/build_cli.ps1`
  - `proxy-redirector-v3/scripts/build_engine.ps1`
  - `proxy-redirector-v3/scripts/build_client.ps1`

### Phase 6: Legacy Codebase Decommissioning & Cleanup
* **Objective**: Safely remove legacy Python codebase (`/core`, `/servers`, `/gui`, `/utils`, `main.py`, `requirements.txt`, etc.) and elevate `proxy-redirector-v3` as the canonical root repository.
* **Verification Command**:
  - Git status and clean tree verification.
  - Zero broken references.

---

## 7. Verification Matrix & Acceptance Gates

| Gate ID | Subsystem | Verification Criterion | Status |
| :--- | :--- | :--- | :--- |
| **G-01** | Engine Core | All unit tests in `engine/internal/...` pass with 0 errors | PENDING |
| **G-02** | Client Core | `client/internal/core` tests pass with mock gRPC server | PENDING |
| **G-03** | CLI Client | `proxy-cli` compiles cleanly and executes all commands (`status`, `start`, `rotate`) | PENDING |
| **G-04** | AdBlock | 100% blocklist rules from legacy `blocklist.json` evaluate accurately | PENDING |
| **G-05** | SOCKS5 & HTTP | Connections relay traffic correctly, LAN bypass verified, failover switches within 500ms | PENDING |
| **G-06** | Data Integrity | Legacy `data/*.json` imports into SQLite without record loss | PENDING |
| **G-07** | Clean Removal | Legacy Python files removed without affecting Go build artifacts or documentation | PENDING |

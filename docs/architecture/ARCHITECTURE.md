# 🏛️ System Architecture Specification — Proxy Management & Free VPN

**System Name**: Proxy Management — Free VPN (Proxy Redirector Ecosystem)  
**Author**: Principal Systems Architect (Agent 1)  
**Classification**: Production-Grade Open-Source System Specification  
**Language Mandate**: 100% English (Source code, documentation, APIs, tests, comments, errors)  
**Target Audience**: Contributors, Implementers (Agent 2+), Reviewers, Maintainers  

---

## 1. System Vision & Boundaries

### 1.1 Core Mission
The system provides a high-performance, modular, self-healing proxy redirection and VPN platform. It enables individual users to route desktop and local network traffic through healthy SOCKS5 and HTTP proxies with zero-leak failover, dynamic IP rotation (Surge Mode), and domain-level ad/tracker blocking, while supporting an optional cloud-managed multi-tenant SaaS orchestrator.

### 1.2 Architectural Boundary & Tier Separation
```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        TIER 1: HIGH-PERFORMANCE GO CORE ENGINE                         │
│                                                                                        │
│   ┌───────────────────────────┐                      ┌──────────────────────────────┐  │
│   │  Wails Desktop GUI (React)│                      │ Standalone CLI (`proxy-cli`) │  │
│   └─────────────┬─────────────┘                      └──────────────┬───────────────┘  │
│                 │                                                   │                  │
│                 └─────────────────────┬─────────────────────────────┘                  │
│                                       ▼                                                │
│                     ┌───────────────────────────────────┐                              │
│                     │     Client Core (client/core)     │                              │
│                     │ - Local SOCKS5 Proxy (:1080)      │                              │
│                     │ - Local HTTP Proxy (:8080)        │                              │
│                     │ - LAN Whitelist & Tracker         │                              │
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
│  TIER 2: EMBEDDED WEB DASHBOARD       │    TIER 3: CLOUD SAAS PLATFORM (Node.js)       │
│  (engine/static - Port :9090)         │    (saas/ - Express/Fastify + TypeScript)      │
│                                       │                                                │
│  - 6-Tab Real-time Glassmorphic UI    │    - Multi-tenant User Accounts & Auth (JWT)   │
│  - Active Proxy & Gateway Telemetry   │    - Stripe Billing & Invoicing                │
│  - Interactive AdBlock Rules/Lists    │    - Static Dedicated IP Lease Orchestrator    │
│  - Historical Proxy Leaderboard       │    - Prisma PostgreSQL (Supabase) + Redis      │
│  - Live Engine Config Controller      │    - RFC 7807 Standard Error Contracts         │
└───────────────────────────────────────┴────────────────────────────────────────────────┘
```

---

## 2. Component Taxonomy & Responsibilities

### 2.1 Engine Subsystems (`engine/internal/`)
| Subsystem | Responsibility | Invariant / Guarantee |
| :--- | :--- | :--- |
| **`proxy.Checker`** | Asynchronous multi-threaded latency, anonymity, SSL, and protocol probing. | Never blocks main thread; isolates goroutine panics per proxy check. |
| **`proxy.Manager`** | Thread-safe in-memory proxy pool indexing, ranking, and auto-tagging. | Protected by `sync.RWMutex`; assigns stickiness bonus (+1000) to active proxy to prevent flapping. |
| **`proxy.Rotator`** | Dynamic proxy rotation ("Surge Mode") by time interval, request count, or lowest latency. | Zero-leak rotation: in-flight TCP sessions finish on prior proxy; new handshakes use the new proxy. |
| **`failover.Handler`**| Circuit-breaker and automatic switchover upon consecutive failures. | Switches to next-best candidate within ≤ 500ms; enforces dead proxy cooldown. |
| **`adblock.Engine`** | Local DNS and host-level ad, tracker, and malware domain filtering. | $O(k)$ trie/hash lookups; evaluates whitelist before exact and wildcard matches. |
| **`database.SQLiteDB`**| High-concurrency persistence for proxies, metrics, and configurations. | Enforces `WAL` mode with `_busy_timeout=5000` and single-writer concurrency. |
| **`server.GRPCServer`**| Core RPC interface on `:50051` serving desktop GUI and CLI client. | Strict Protobuf schema (`proto/engine/v1/engine.proto`). |
| **`server.RESTServer`**| Administrative REST API on `:9090` serving embedded web dashboard. | CORS enabled for local development; supports optional Basic Auth. |

### 2.2 Client Subsystems (`client/internal/`)
| Subsystem | Responsibility | Invariant / Guarantee |
| :--- | :--- | :--- |
| **`core.Core`** | Central business logic shared 100% between Wails GUI and `proxy-cli`. | Single source of truth; neither UI layer implements independent proxying. |
| **`proxy.SOCKS5Server`**| Local SOCKS5 proxy relay listening on `0.0.0.0:1080`. | Handles authentication, LAN bypass, and upstream proxy tunneling. |
| **`proxy.HTTPProxyServer`**| Local HTTP/HTTPS CONNECT proxy server on `0.0.0.0:8080`. | Supports raw HTTP forwarding and HTTPS CONNECT tunneling. |
| **`proxy.ClientTracker`**| LAN client connection registry and device kick manager. | Tracks remote LAN devices without logging localhost traffic. |

### 2.3 Cloud SaaS Platform (`saas/src/`)
| Subsystem | Layer | Responsibility |
| :--- | :--- | :--- |
| **`core/domain`** | Domain Layer | Pure domain entities (`UserEntity`, `StaticProxyEntity`, `RelayEntity`) and domain exceptions. |
| **`core/ports`** | Ports Layer | Abstract repository interfaces (`IUserRepository`, `IProxyRepository`, `IRelayRepository`) and payment gateways. |
| **`core/use-cases`**| Application Layer| Business logic (`LeaseStaticProxyUseCase`). |
| **`infrastructure`**| Infrastructure | Prisma ORM repositories for PostgreSQL (Supabase) and Redis token/rate-limit caches. |
| **`presentation`** | Presentation | Express REST v1 routes, RFC 7807 problem details handler, `X-Request-Id` tracing, and `Idempotency-Key` guard. |

---

## 3. Data Flow & Control Flow

### 3.1 Local User Traffic Flow (Self-Hosted Mode)
```text
[User Browser / Device]
         │ (HTTP/HTTPS or SOCKS5 traffic)
         ▼
[Client Local Relay (:1080 / :8080)]
         │
         ├──► [ClientTracker: Check LAN Whitelist / Device Authorization]
         │
         ├──► [gRPC Query: GetActiveProxy() from Engine (:50051)]
         │
         ├──► [AdBlock Check: Drop request if domain matches blacklist]
         │
         ▼
[Upstream Managed Proxy (SOCKS5 / HTTP)]
         │ (Encrypted / Proxied egress)
         ▼
    [Target Internet Host]
```

### 3.2 Cloud SaaS Relay Flow (SaaS Mode)
```text
[Client App / CLI]
         │ (Authenticates via JWT)
         ▼
[Central SaaS API (:4000)]
         │
         ├──► [Verify Subscription & Quota in Redis/Postgres]
         ├──► [Assign Least-Loaded Relay Node in Target Region]
         └──► [Issue Signed Short-Lived Session Token]
         │
         ▼
[Multi-Region VPS Relay Node]
         │ (Validates Session Token with Central SaaS via gRPC/Heartbeat)
         ▼
[Dedicated Static ISP / Datacenter Proxy]
         │
         ▼
    [Target Internet Host]
```

---

## 4. Storage Architecture & Schemas

### 4.1 Local Engine Storage (SQLite WAL)
- **Path**: `data/proxy_redirector.db`
- **Tables**:
  - `proxies`: Proxy endpoints, protocol, credentials, country, city, last alive time.
  - `proxy_metrics`: Response times, reliability score (0-100), consecutive failures, auto-tags (`fast`, `stable`, `failing`).
  - `adblock_rules`: Domains, categories (`ads`, `tracking`, `malware`, `custom`), wildcard flags.
  - `engine_config`: Dynamic configuration key-value pairs.

### 4.2 Cloud SaaS Storage (PostgreSQL / Supabase via Prisma)
- **Schema Location**: `saas/prisma/schema.prisma`
- **Key Entities**: `User`, `Plan`, `Subscription`, `Device`, `RelayServer`, `StaticProxy`, `ProxySession`, `UsageLog`, `ApiKey`, `AuditLog`.

---

## 5. Security & Invariant Taxonomy

1. **`INV-SEC-01: Zero-Leak Failover`**: When a proxy fails or is rotated, in-flight TCP sessions terminate gracefully; subsequent connection handshakes immediately target the newly elected candidate.
2. **`INV-SEC-02: Zero Plaintext Credentials in Logs`**: Proxy usernames, passwords, and user tokens must be sanitized before passing to structured loggers (`slog` in Go, `pino` in Node.js).
3. **`INV-SEC-03: RFC 7807 Error Uniformity`**: All SaaS API errors must return standard `application/problem+json` envelopes with deterministic machine-readable `code` attributes.
4. **`INV-SEC-04: Idempotency Verification`**: Non-safe HTTP mutations (`POST /api/v1/billing/checkout`) must accept `Idempotency-Key` headers stored in Redis with 24-hour TTL.
5. **`INV-SEC-05: Strict Subnet Confinement`**: Local proxy listeners on `0.0.0.0` allow LAN connections only if authorized or explicitly permitted by the local device tracker.

---

## 6. Directory Layout & Organization

```text
D:\files\Contracted projects\IdeaProjects\Proxy_redirector\
├── engine/                       # High-speed Go Proxy Daemon & REST API (:9090)
│   ├── cmd/engine/main.go        # Daemon Entrypoint
│   ├── internal/                 # adblock, config, database, failover, proxy, server
│   └── static/                   # Embedded HTML5/CSS3/JS Web Dashboard
├── client/                       # Dual Clients Layer
│   ├── cmd/cli/                  # Headless CLI (`proxy-cli`)
│   ├── internal/                 # Client core, SOCKS5 (:1080), HTTP (:8080), tracker
│   └── frontend/                 # Wails React 18 GUI Application
├── shared/                       # Models, protobuf bindings, utils, metadata
├── proto/                        # Protobuf RPC definitions (engine.proto)
├── saas/                         # Enterprise Node.js / TypeScript SaaS Cloud Platform
│   ├── prisma/schema.prisma      # PostgreSQL / Supabase schema
│   ├── src/core/                 # Domain, Ports, Use-cases
│   ├── src/infrastructure/       # Prisma repositories
│   ├── src/presentation/         # RFC 7807, Idempotency, Request-Id
│   ├── src/modules/              # Auth, Users, Billing, Proxies, Relays, Usage, Admin
│   ├── src/workers/              # Proxy health worker, usage aggregator
│   └── docker-compose.yml        # PostgreSQL, Redis, SaaS API stack
├── scripts/                      # Build & Dev automation scripts
├── data/                         # Persistent JSON configurations and databases
├── docs/                         # Canonical technical documentation
├── .github/workflows/            # Automated CI/CD pipelines
├── go.work                       # Unified Go workspace
├── PLAN.md                       # Master Architecture Plan
├── PROGRESS.md                   # Milestone verification log
├── ROADMAP_NEXT_PHASE.md         # Next implementation steps
└── README.md                     # Canonical project documentation
```

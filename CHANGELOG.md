# Changelog

All notable changes to this project will be documented in this file.

## [3.0.0] — 2026-10-01 (Unified Architecture Release)

### Added
- ⚡ **High-Performance Go Daemon (`engine/`)**
  - Concurrency-safe Go 1.22+ proxy engine daemon.
  - Multi-threaded proxy checking with SSL verification, latency probing, and anonymity detection.
  - Dynamic Surge IP rotation with zero connection drops.
  - SQLite WAL mode database persistence with automated JSON flat-file data migration.
  - SOCKS5 and HTTP CONNECT proxy relays on ports `:1080` and `:8080`.
- 💻 **Dual Client Architecture (`client/`)**
  - Native **Wails v2** Desktop GUI with React 18 & Tailwind CSS.
  - Standalone headless **`proxy-cli`** Cobra CLI binary for servers and scripts.
  - Unified `client/internal/core` business logic shared 100% between GUI and CLI.
- 🌐 **Modern Embedded Web Dashboard (`engine/static`)**
  - Responsive 6-tab dark glassmorphic web UI on port `:9090`.
  - Tabs: Live Dashboard, Proxy Pool, AdBlock Center, Traffic Stream, Analytics, and Dynamic Engine Settings.
- ☁️ **Enterprise Cloud SaaS Backend (`saas/`)**
  - Node.js 20+ & TypeScript backend built with Clean Hexagonal Architecture.
  - Prisma ORM with PostgreSQL / Supabase multi-container Docker Compose configuration (`docker-compose.supabase.yml`).
  - Redis token blacklisting, sliding-window rate limiting, and real-time bandwidth metering.
  - Multi-region VPS relay deployment scripts (`deploy_relay.sh` and `deploy_relay.ps1`).
  - Dedicated static residential and datacenter IP leasing with fraud score verification.
  - Full React 18 / Vite SaaS User Web Portal in `saas/frontend/`.
- 📚 **Comprehensive Open-Source Documentation Suite**
  - `ARCHITECTURE.md`, `PLAN.md`, `PROGRESS.md`, `ROADMAP_NEXT_PHASE.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `SUPPORT.md`, `GOVERNANCE.md`, `MAINTAINERS.md`, `docs/TROUBLESHOOTING.md`.
  - Multi-OS GitHub Actions CI matrix (`.github/workflows/ci.yml`).

### Removed
- 🗑️ Decommissioned and purged legacy Python codebase and flat-file dependency scripts.

---

## [2.3.0] — 2026-04-30

### Added
- 📖 **Comprehensive Documentation Overhaul**
  - Full mobile setup guide (Android & iOS) with step-by-step instructions
  - SocksDroid (SOCKS5) setup guide for Android
  - Detailed ad/site blocking explanation with architecture diagrams
  - Complete REST API reference with all endpoints
  - Comparison table for mobile proxy methods
  - Arabic + English bilingual documentation
- 📝 **Developer Documentation** — Updated CONTRIBUTING.md with full architecture walkthrough, data flow diagrams, and module descriptions

## [2.2.0] — 2026-04-19

### Added
- 📈 **Proxy Analytics Engine** — Permanent tracking of uptime %, average speed, and daily trends.
  - Proxy Auto-Tagging (`fast`, `stable`, `slow`, `unreliable`, `new`, `recommended`).
  - Reliability Score (0-100): stability (40%), speed (30%), consistency (20%), recency (10%).
  - Reliability Leaderboard for the best global proxies.
  - Country Performance tracking (aggregate stats per country).
  - Speed history (last 50 readings) with min/max/avg tracking.
  - Daily speed averages (last 14 days retained).
  - Hourly uptime percentages.
  - Persistent storage in `data/analytics.json` with periodic saves (every 20 checks).
- 🌍 **Geographical Targeting** — Only scan and use proxies from a specific chosen country (`COUNTRY_FILTER` setting).
- ⏱️ **Speed Threshold Control** — Automatically reject proxies strictly slower than a given time limit (`MAX_SPEED_MS`).
- ⚙️ **Dynamic Settings UI** — Manage server ports, authentication, pool behavior, and engine rules from the new `Settings` GUI tab without editing code.
- 🖥️ **App Display Settings** — Easily configure the app to `Start GUI Automatically` and `Hide Console (Windows)` entirely from the new UI.

## [2.1.0] — 2026-04-19

### Added
- 🛡️ **Ad Blocker Engine** — Built-in ad, tracker, and malware domain blocking
  - 50+ default block rules for common ad networks and trackers
  - Category system (`ads`, `tracking`, `malware`, `custom`) with independent toggles
  - Wildcard pattern support (`*ads.*`, `*tracker.*`, `*adserver*`)
  - Whitelist/exceptions for domains that should bypass blocking
  - Subdomain matching (blocking `example.com` blocks `ads.example.com`)
  - Block statistics with top blocked domains tracking
  - Persistent rules in `data/blocklist.json`
  - Integrated into both SOCKS5 and HTTP proxy servers
- 📊 **Dashboard Redesign** — Complete UI overhaul
  - Sidebar navigation with tabs (Dashboard, Proxy Pool, Ad Blocker, Traffic Log, Analytics, Settings)
  - Stat cards with gradient accents and live counters
  - Search and filter on proxy pool and traffic log tables
  - Traffic status filter (All / Success / Blocked / Failed)
  - Blocked requests highlighted with 🚫 icon
- 📁 **Project Restructuring** — Organized codebase
  - `core/` — Proxy engine modules (`proxy_manager`, `proxy_checker`, `failover_handler`, `adblock_manager`)
  - `servers/` — Network server modules (`socks5_server`, `http_proxy_server`, `api_server`)
  - `gui/` — Desktop GUI launcher (pywebview with single-instance mutex)
  - `utils/` — Utility modules (`traffic_logger`)
  - `data/` — Data files (config, proxies, status, analytics, blocklist)
- 📝 **GitHub Documentation**
  - Professional README with full feature list and setup guide
  - CONTRIBUTING.md with development guidelines
  - MIT License
  - .gitignore for Python projects
  - This CHANGELOG

## [2.0.0] — 2026-04-18

### Added
- 🖥️ **Desktop GUI Dashboard** — pywebview-based desktop application
  - Frameless window with dark theme (`#0a0e17`)
  - Loading screen shown instantly during server boot
  - Window controls exposed via pywebview JS API (minimize, maximize, close)
- 🌐 **HTTP Proxy Server** — For phones and browsers that don't support SOCKS5
  - CONNECT method for HTTPS tunnels
  - HTTP forwarding for plain HTTP requests
  - WebSocket upgrade support
  - Basic Auth with Proxy-Authorization header
- 🔐 **Authentication** — Username/password with local network whitelist
  - SOCKS5 auth (RFC 1929 username/password)
  - HTTP Proxy auth (Basic scheme)
  - Auto-whitelist for `192.168.x.x` and `127.0.0.1`
- 📝 **Traffic Logger** — Request tracking with per-client statistics
  - In-memory ring buffer (last 500 entries)
  - Per-client stats (requests, bytes, first/last seen, unique targets)
- 🔌 **REST API** — Internal API server (`127.0.0.1:9090`) bridging GUI to proxy engine
  - ProxyEngine class orchestrating all components
  - Async event loop in separate thread
  - Static file serving for dashboard
- 👥 **Multi-client Support** — Network-wide access from any device

## [1.0.0] — 2026-04-16

### Added
- 🔄 **Proxy Pool Management** — Load, validate, and rank proxies from JSON
- ⚡ **Smart Scoring** — Speed, reliability, and recency-based ranking
- 🔁 **Failover** — Automatic switching on proxy failure
- 🔌 **SOCKS5 Server** — Local tunnel for desktop applications
- 📊 **Console Dashboard** — Real-time status display in terminal
- 🔁 **Second Chance System** — Dead proxies retried after cooldown period

# 🏛️ Architecture Overview — Proxy Redirector v3

---

## 1. High-Level Vision

Proxy Redirector v3 transforms the legacy single-process Python application into a modular, carrier-grade, multi-tier system:

1. **High-Speed Go Engine Daemon (`engine/`)**: Headless backend responsible for proxy verification, dynamic Surge rotation, local SOCKS5/HTTP relays, adblocking, and SQLite WAL storage.
2. **Dual Client Applications (`client/`)**: Wails v2 desktop application (React 18 / TypeScript) and standalone headless CLI (`proxy-cli`).
3. **Cloud SaaS Platform (`saas/`)**: Enterprise Node.js 20+ / TypeScript service built with Clean Architecture, Prisma ORM (PostgreSQL/Supabase), Redis caching, and Stripe billing.

```text
┌────────────────────────────────────────────────────────┐
│                      Client Layer                      │
│   ┌───────────────────────────┐ ┌────────────────────┐ │
│   │ Wails Desktop GUI (React) │ │ Headless CLI Tool  │ │
│   └─────────────┬─────────────┘ └──────────┬─────────┘ │
│                 │                          │           │
│                 └─────────────┬────────────┘           │
│                               ▼                        │
│                 Client Core (client/core)              │
│               - SOCKS5 Proxy Relay (:1080)             │
│               - HTTP CONNECT Relay (:8080)             │
│               - Device Tracker & LAN Whitelist         │
└───────────────────────────────┬────────────────────────┘
                                │ gRPC (localhost:50051)
┌───────────────────────────────▼────────────────────────┐
│            Go Proxy Engine Daemon (engine/cmd)         │
│  - Multi-threaded Async Proxy Checker (Latency/SSL)    │
│  - Surge Dynamic Rotator (Timed, Request, Lowest Ping) │
│  - AdBlock & Tracker Interceptor Engine (Trie/Regex)   │
│  - Circuit-Breaker Failover Handler (Second-Chance)    │
│  - Analytics Engine (Reliability Score 0-100)          │
│  - SQLite WAL Database Persistence                     │
│  - REST API & Glassmorphic Dashboard (:9090)           │
└────────────────────────────────────────────────────────┘
```

---

## 2. Communication Protocols

| Channel | Protocol | Port | Description |
| :--- | :--- | :--- | :--- |
| **Engine Core RPC** | gRPC (HTTP/2 + Protobuf) | `50051` | High-speed bidirectional communication between Engine and Clients. |
| **SOCKS5 Relay** | SOCKS5 (RFC 1928) | `1080` | Local socket proxy for browsers and desktop applications. |
| **HTTP Proxy** | HTTP / HTTPS CONNECT | `8080` | Local HTTP proxy for mobile devices and non-SOCKS clients. |
| **Engine Admin Web** | HTTP / REST | `9090` | Serves embedded 6-tab operational dashboard. |
| **Cloud SaaS API** | HTTPS / REST v1 | `4000` | Central multi-tenant identity, billing, and relay orchestrator. |

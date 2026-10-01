# 🔄 Modes of Operation — Self-Hosted vs. Cloud SaaS

Proxy Redirector supports two distinct operational modes designed for individual users and enterprise subscribers.

---

## 1. Comparison Matrix

| Feature | Self-Hosted Local Mode (Free / Offline) | Cloud SaaS Mode (Pro / Enterprise) |
| :--- | :--- | :--- |
| **Hosting Model** | Runs 100% locally on user machine | Central SaaS backend + Multi-region relay nodes |
| **Proxy Source** | Local scraped public list / Custom inputs | Clean dedicated static residential & datacenter IPs |
| **Bandwidth Limits** | Unlimited (bound by local network) | Metered by tier quota (50GB, 200GB, 1TB) |
| **Authentication** | Optional local username/password | Central JWT Access + Refresh Tokens with device limits |
| **Multi-Region Routing** | Depends on local proxy availability | Managed global VPS nodes (US, EU, Asia-Pacific) |
| **Ad & Tracker Blocker** | Enabled locally (50+ built-in rules) | Enabled with cloud synchronized blocklist updates |
| **Storage Engine** | SQLite (WAL mode in `data/`) | PostgreSQL 16 (Supabase) + Redis 7 caching |

---

## 2. Self-Hosted Mode Architecture
In Self-Hosted mode, the Go Engine acts as a self-contained daemon. It fetches public proxy lists, verifies them asynchronously, selects the lowest-latency node, and routes local SOCKS5/HTTP traffic through it.

## 3. Cloud SaaS Mode Architecture
In Cloud SaaS mode, the client application authenticates against `https://api.proxyredirector.io`, receives an optimized relay node assignment, and establishes an authenticated tunnel with dedicated static IPs.

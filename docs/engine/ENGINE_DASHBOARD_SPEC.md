# 🖥️ Embedded Engine Web Dashboard & Node.js Bridge Specification

**Task ID**: `TASK-ENGINE-DASHBOARD-UPGRADE`  
**Status**: `APPROVED / DESIGN BLUEPRINT`  
**Target Locations**: `proxy-redirector-v3/engine/static/` & `proxy-redirector-v3/engine/internal/server/rest_api.go`  
**Standard**: High-Fidelity Responsive Dark Glassmorphism (Modern Outfit typography, zero external bloated dependencies, full REST/gRPC backend alignment)

---

## 1. Executive Summary & Problem Context

### 1.1 Context
In the legacy Python system (v2.1), the embedded web dashboard provided a sleek, comprehensive, 6-tab operational center:
1. **Live Dashboard**: Real-time stat cards (Active Connections, Alive Proxies, Ads Blocked, Total Requests), Server & LAN IP cards, Active Proxy status with instant force-switch, Live Connected Client table with protocol/target breakdown, Continuous Discovery status with progress bars, and Online Proxy Fetch monitors.
2. **Proxy Pool**: Full searchable table (IP:Port, Type, Country, Status, Speed, Reliability Score, SSL status, Failures), manual proxy selector with lock indicator, and an interactive "+ Add Custom Proxy" dialog.
3. **Ad Blocker Management**: Master toggle, category badges (`Ads`, `Tracking`, `Malware`, `Custom`), top blocked domains ranking, add custom domain/pattern rule form, active rules table with delete action, and expandable exception whitelist.
4. **Traffic Log**: Live stream of network transactions with filter by status (`All`, `Success`, `Blocked`, `Failed`), search box, client IP, protocol, HTTP method, target URL, and "Clear Log" button.
5. **Analytics Engine**: Summary stat cards (Avg Speed, Avg Uptime, Best Score, Proxies Tracked), Leaderboard table of top proxies by reliability, and Country Performance aggregations.
6. **Dynamic Settings**: Live form updating `engine_config.json` with immediate save (Ports, Auth, Country targets, Thresholds, Discovery batch sizes, Failover delays).

The Go Engine's embedded web interface (`engine/static/`) will be upgraded to mirror and enhance all 6 capabilities seamlessly.

---

## 2. Architectural Blueprint & Endpoint Contract

```text
┌────────────────────────────────────────────────────────────────────────┐
│               Embedded Dashboard UI (HTML5 / CSS3 / Vanilla JS)        │
│  ┌───────────┐ ┌──────────┐ ┌───────────┐ ┌─────────┐ ┌──────────────┐ │
│  │ Dashboard │ │ Pool Tab │ │  AdBlock  │ │ Traffic │ │  Analytics   │ │
│  └─────┬─────┘ └────┬─────┘ └─────┬─────┘ └───┬─────┘ └──────┬───────┘ │
└────────┼────────────┼─────────────┼───────────┼──────────────┼─────────┘
         │            │             │           │              │ REST API
┌────────▼────────────▼─────────────▼───────────▼──────────────▼─────────┐
│                     Go Engine REST API (:9090)                         │
│  - GET  /api/status            -> Server uptime, active proxy, metrics │
│  - GET  /api/proxies           -> Full pool list + filtering           │
│  - POST /api/proxy/select      -> Manual proxy lock / auto-switch      │
│  - POST /api/proxy/add         -> Insert custom proxy + instant check  │
│  - GET  /api/blocklist         -> Adblock stats, categories, rules     │
│  - POST /api/blocklist/toggle  -> Master & category toggle switches    │
│  - POST /api/blocklist/rules   -> Add/remove exact and wildcard rules  │
│  - GET  /api/analytics         -> Tracked proxy profiles & top ranks   │
│  - GET  /api/countries         -> Country performance aggregations     │
│  - GET  /api/config            -> Current engine configuration         │
│  - POST /api/config            -> Update engine configuration          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Screen Specifications & Tab Manifest

### 3.1 Tab 1: Live Operational Dashboard
* **Metrics Cards (4-Grid)**:
  - `🔌 Active Connections`: Real-time active TCP proxy client connections.
  - `🔄 Alive Proxies`: Count of healthy proxies in the pool.
  - `🛡️ Ads Blocked`: Lifetime count of blocked requests.
  - `📊 Total Requests`: Lifetime routed requests counter.
* **Server & Network Cards**:
  - Local Server status (SOCKS5 `:1080`, HTTP `:8080`, REST `:9090`).
  - Network IPs: Local machine IPv4 addresses for LAN sharing.
  - Active Proxy Banner: IP, Country flag, Latency badge, SSL verified status, and **[⚡ Force Switch]** action button.
* **Connected Clients Table**:
  - Columns: `Client IP`, `Protocol` (SOCKS5/HTTP), `Target Host`, `Duration`.
* **Discovery & Background Workers**:
  - Live progress bar showing discovery scan rounds, checked count, alive found count.

### 3.2 Tab 2: Smart Proxy Pool
* **Filter Bar**: Search by IP/Country, filter by protocol (SOCKS5, SOCKS4, HTTP, HTTPS), filter alive only.
* **Add Custom Proxy Modal**: Input IP, Port, Type, Username, Password with instant test verification.
* **Interactive Table**:
  - Columns: `#`, `IP:Port`, `Type`, `Country`, `Status` (Alive/Dead), `Speed (ms)`, `Score (0-100)`, `SSL Verified`, `Fails`, `Action` (Select / Lock / Test).

### 3.3 Tab 3: AdBlock & Security Center
* **Master Switch**: Enable / Disable engine-wide adblocking.
* **Category Badges**: Independent toggles for `🚫 Ads`, `👁️ Tracking`, `☠️ Malware`, `⚙️ Custom`.
* **Top Blocked Widget**: Live bar chart or ranked list of top intercepted domains.
* **Rule Editor**: Add domain (e.g. `doubleclick.net`) or wildcard pattern (e.g. `*adserver*`).
* **Exception Whitelist**: Accordion list to whitelist critical business domains.

### 3.4 Tab 4: Traffic & Audit Logs
* **Live Ingestion**: WebSockets or 2-second polling of recent transactions.
* **Filter Select**: `All`, `✓ Success`, `🚫 Blocked`, `✗ Failed`.
* **Columns**: `Time`, `Status Badge`, `Client IP`, `Protocol`, `Method`, `Target URL / Domain`.

### 3.5 Tab 5: Analytics & Global Leaderboard
* **Performance Overview**: Average Speed across pool, Average Uptime %, Best Performing Proxy, Total Tracked.
* **Leaderboard Table**: Ranked by reliability score with auto-tags (`fast`, `stable`, `failing`).
* **Country Aggregates Table**: Country name, Total proxies, Average speed, Average uptime %.

### 3.6 Tab 6: Dynamic Engine Configuration
* Form fields mapped directly to `engine_config.json`:
  - Network Ports (`SOCKS5`, `HTTP`, `REST`, `gRPC`).
  - Authentication (Enable toggle, Username, Password).
  - Proxy Pool Targets (Target Country filter, Min Alive Pool, Recheck Interval).
  - Speed & Anonymity Limits (Max Speed Threshold ms, Anonymity Enforcement, SSL Check).
  - Failover Delays (Max Retries, Dead Proxy Cooldown seconds).

---

## 4. Bridge to Node.js SaaS Cloud Architecture

```text
┌────────────────────────────────┐         ┌────────────────────────────────┐
│   Go Engine / Local Node       │         │   Central Node.js SaaS Cloud   │
│                                │         │                                │
│   Local Dashboard (:9090)      │         │   Central SaaS API & Web       │
│   - Self-hosted proxy control  │◄───────►│   - Multi-tenant accounts      │
│   - Embedded zero-dependency   │  gRPC   │   - Stripe billing & metering  │
│   - Direct hardware access     │  REST   │   - Cloud proxy fleet control  │
└────────────────────────────────┘         └────────────────────────────────┘
```

1. **Dual Operation Mode**:
   - **Local Self-Hosted Mode**: The Go Engine runs on the user's desktop/server, serving the upgraded embedded web dashboard on port `9090`.
   - **SaaS Cloud Mode**: The Go Engine instances act as managed Relay Nodes, communicating with the central **Node.js SaaS platform** (`saas/`) via gRPC and token authentication.
2. **Unified Design Language**:
   - Both the local embedded dashboard and the Node.js SaaS web application share the identical dark glassmorphic design system (`#0a0a0f` canvas, `#3b82f6` primary, Outfit/Inter typography, and Radix/Lucide iconography).

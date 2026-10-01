# 🗺️ Roadmap & Next Phase Implementation Plan (ROADMAP_NEXT_PHASE.md)

**Target Milestone**: Phase 4 — Cloud Infrastructure Deployment & Production Launch  
**Architect**: System Architecture Specialist  

---

## 1. Upcoming Implementation Stages

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               PHASE 4 EXECUTION ROADMAP                                │
│                                                                                        │
│   [Stage 1: Supabase Stack] ──► [Stage 2: Database Seed] ──► [Stage 3: VPS Relay Mesh] │
│   - Supabase Studio Docker      - Default Plans (Free/Pro)    - SOCKS5 / Wireguard     │
│   - PostgreSQL + PostgREST      - Admin & Test Accounts       - Automated Heartbeats   │
│   - Kong API Gateway            - Initial Static Proxy Pool   - Multi-Region US/EU/Asia│
│                                                                                        │
│                                 [Stage 4: SaaS Web Portal]                             │
│                                 - Next.js / React 18 Web UI                            │
│                                 - Auth, Billing & Dashboard                            │
│                                 - Static Proxy Allocation                              │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Detailed Task Breakdown

### 🎯 Task 1: Supabase Docker Self-Hosted Stack (`saas/docker-compose.supabase.yml`)
* **Objective**: Configure a complete, reproducible self-hosted Supabase environment running in Docker alongside the Node.js SaaS API.
* **Services**:
  1. `supabase-db`: PostgreSQL 16 with `pgvector` and Supabase extensions.
  2. `supabase-auth`: GoTrue auth server.
  3. `supabase-rest`: PostgREST HTTP REST API engine.
  4. `supabase-realtime`: Realtime WebSocket event dispatcher.
  5. `supabase-studio`: Web UI database dashboard on port `8000`.
  6. `supabase-kong`: API gateway router on port `54321`.
* **Prisma Connection**: Direct URI `postgresql://postgres:postgres@localhost:54322/postgres`.

---

### 🎯 Task 2: Database Seeding Engine (`saas/prisma/seed.ts`)
* **Objective**: Populate the database with initial enterprise seed data upon fresh deployment.
* **Entities Seeded**:
  1. **Subscription Plans**:
     - `Free`: $0/mo, 500MB bandwidth, 1 device, 1 region.
     - `Basic`: $5/mo, 50GB bandwidth, 2 devices, 3 regions, AdBlock enabled.
     - `Pro`: $12/mo, 200GB bandwidth, 5 devices, all regions, dedicated static IP access.
     - `Business`: $30/mo, 1TB bandwidth, 15 devices, SLA priority support.
  2. **System Administrator Account**: `admin@proxyredirector.io` with role `ADMIN`.
  3. **Initial Static Proxies**: Sample static ISP & Datacenter proxy entries across US, DE, and SG regions.

---

### 🎯 Task 3: Remote Relay Deployment Script (`scripts/deploy_relay.sh`)
* **Objective**: One-click shell script for Ubuntu/Debian VPS nodes to convert them into secure Proxy Redirector Relay Nodes.
* **Script Workflow**:
  1. Installs Dante SOCKS5 daemon and Go engine binary.
  2. Configures TLS encryption and firewall (UFW) rules.
  3. Configures systemd service `proxy-relay.service`.
  4. Registers the node with `https://saas-api.domain.com/api/v1/relays/heartbeat`.

---

### 🎯 Task 4: SaaS User Web Portal & Marketing Site (`saas/frontend/`)
* **Objective**: Modern responsive client portal built with React 18 / Vite / Tailwind CSS.
* **Key Pages**:
  - `Landing Page`: Feature highlights, speed benchmarks, plan comparison pricing table.
  - `Auth Screens`: Modern glassmorphic Login, Register, Password Reset.
  - `User Dashboard`: Real-time bandwidth usage meter, active subscription card, connected devices list.
  - `Static Proxy Picker`: Interactive world map / country dropdown to lease dedicated static IPs.
  - `Download Center`: Binary download links for Windows installer (`.exe`) and Linux CLI (`proxy-cli`).

---

## 3. Quick-Start Execution Commands

```bash
# 1. Start SaaS Database & Redis in Docker
cd saas
docker-compose up -d

# 2. Run Database Migrations & Seeds
npx prisma migrate dev
npx prisma db seed

# 3. Start SaaS API in Development Mode
npm run dev

# 4. Start Local Go Proxy Engine
cd ..
go run ./engine/cmd/engine

# 5. Connect via Headless CLI
./client/build/proxy-cli.exe start --country US
```

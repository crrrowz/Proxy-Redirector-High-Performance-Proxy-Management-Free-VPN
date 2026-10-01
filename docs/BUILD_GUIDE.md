# 🛠️ Complete Build, Run & Verification Guide

This guide provides end-to-end, step-by-step instructions for building, running, and verifying every component of **Proxy Redirector & Free VPN** on Windows, Linux, and macOS.

---

## 🧭 System Components Map

```text
Proxy Redirector Repository
├── Tier 1: Go Engine Daemon          → go run ./engine/cmd/engine  (Port :50051 / :9090)
├── Tier 2: Headless CLI (proxy-cli)   → go run ./client/cmd/cli     (or client/build/proxy-cli.exe)
├── Tier 3: Wails Desktop GUI         → wails dev / wails build     (client/frontend)
├── Tier 4: Embedded Web Dashboard    → http://localhost:9090       (served by engine)
└── Tier 5: Cloud SaaS Backend (Node) → npm run dev in saas/        (Port :4000)
```

---

## 1. Prerequisites & Toolchain Verification

Open your terminal (PowerShell on Windows or Bash on Linux/macOS) and verify the required runtimes:

```bash
# 1. Verify Go Compiler (Requires Go 1.22+)
go version

# 2. Verify Node.js & NPM (Requires Node.js 20 LTS+)
node -v
npm -v

# 3. Verify Docker (Optional for PostgreSQL & Redis)
docker --version
docker-compose --version
```

---

## 2. Testing the Entire Project

Before running components, you can verify that all automated unit and integration test suites pass with 100% success:

### A. Run Go Engine & Client Test Suites
```bash
# 1. Test all Engine packages (adblock, failover, proxy, sqlite, rest_api)
cd engine
go test -v ./...

# 2. Test Client Core & gRPC Mock Integrations
cd ../client
go test -v ./...

# Return to root
cd ..
```

### B. Run Node.js SaaS Platform Test Suite
```bash
cd saas
npm test
cd ..
```

---

## 3. How to Run and Test Each Component

### ⚡ Step 1: Running the Go Proxy Engine Daemon
The Engine Daemon manages the proxy pool, async health checking, dynamic Surge rotation, local SOCKS5/HTTP relays, and the embedded REST/Web dashboard.

```powershell
# In repository root:
go run ./engine/cmd/engine
```

**What to verify:**
1. Open your browser to: **[http://localhost:9090](http://localhost:9090)**.
2. You will see the **6-Tab Glassmorphic Dashboard**:
   - **Dashboard**: View active proxy, latency, and listening ports (`:1080`, `:8080`, `:9090`, `:50051`).
   - **Proxy Pool**: Search, filter by country, and add custom proxies.
   - **Ad Blocker**: Toggle categories (Ads, Tracking, Malware) and inspect blocked queries.
   - **Traffic Log**: View real-time routed requests.
   - **Analytics**: Leaderboard of top-performing proxies.
   - **Settings**: Live configuration form mapped to `engine_config.json`.

---

### 💻 Step 2: Testing the Headless CLI (`proxy-cli`)
In a second terminal window, you can interact with the running engine using the native CLI binary:

```bash
# 1. Build the standalone CLI binary
.\scripts\build_cli.ps1
# Output: client\build\proxy-cli.exe

# 2. Inspect live engine status and active proxy
./client/build/proxy-cli.exe status

# 3. View status as formatted JSON
./client/build/proxy-cli.exe status --json

# 4. List top proxies from the engine pool
./client/build/proxy-cli.exe pool --limit 10

# 5. Check if an ad domain is blocked
./client/build/proxy-cli.exe adblock --check googleads.g.doubleclick.net

# 6. Trigger an instant proxy failover / rotation
./client/build/proxy-cli.exe rotate --force

# 7. Start the proxy client with dynamic Surge rotation
./client/build/proxy-cli.exe start --country US --surge --surge-interval 30
```

---

### 🔌 Step 3: Routing Real Traffic Through the Local Proxy Relays
With the engine running, configure any browser, phone, or curl command to route traffic through the local relay ports:

```powershell
# Test HTTP CONNECT Proxy on port 8080:
curl.exe -x "http://127.0.0.1:8080" "https://api.ipify.org"

# Test AdBlock Interception (Ad domains will be blocked immediately):
curl.exe -x "http://127.0.0.1:8080" "http://doubleclick.net"

# Test SOCKS5 Proxy on port 1080:
curl.exe --socks5 "127.0.0.1:1080" "https://api.ipify.org"
```

---

### ☁️ Step 4: Running the Cloud SaaS Backend (Node.js & TypeScript)

```bash
cd saas

# 1. Start Supabase (PostgreSQL 15, Studio, Redis, Kong) in Docker
docker-compose -f docker-compose.supabase.yml up -d

# 2. Install dependencies & generate Prisma client
npm install
npx prisma generate

# 3. Seed default subscription plans (Free, Basic, Pro, Business) and admin account
npm run prisma:seed

# 4. Start the SaaS API server in development mode
npm run dev
```

**What to verify:**
- **API Health Check**: Open [http://localhost:4000/health](http://localhost:4000/health) in your browser.
- **Supabase Studio Dashboard**: Open [http://localhost:8000](http://localhost:8000) to inspect PostgreSQL tables.

---

### 🌐 Step 5: Running the SaaS Web Portal (`saas/frontend`)

```bash
cd saas/frontend

# Install dependencies and start Vite dev server
npm install
npm run dev
```

**What to verify:**
- Open **[http://localhost:3000](http://localhost:3000)** in your browser.
- You will see the landing page, global relay mesh cards, tier plans pricing table, and the Sign In / Registration modal connected to the backend API.

---

## 📦 Automated Single-Command Multi-Platform Build

To compile all release binaries at once:

```powershell
# In repository root:
.\scripts\build_all.ps1 -Release

# Generated Artifacts:
# 1. Engine Daemon:   engine\build\engine.exe
# 2. Headless CLI:    client\build\proxy-cli.exe
# 3. Desktop GUI:     client\build\bin\ProxyRedirector.exe
```

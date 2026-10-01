# 🔧 Troubleshooting & Diagnostics Guide

This document provides diagnosis and resolution procedures for common runtime, network, and development issues encountered when operating **Proxy Redirector & Free VPN**.

---

## 1. Port Conflicts & Network Binding Errors

### Problem: `bind: address already in use` (Ports 1080, 8080, 9090, or 50051)
* **Cause**: Another service or a previous instance of Proxy Redirector is occupying one of the standard ingress ports.
* **Diagnosis**:
  - **Windows (PowerShell)**:
    ```powershell
    Get-NetTCPConnection -LocalPort 1080, 8080, 9090, 50051 -ErrorAction SilentlyContinue | Select-Object LocalAddress, LocalPort, OwningProcess
    ```
  - **Linux / macOS**:
    ```bash
    sudo lsof -i :1080,8080,9090,50051
    ```
* **Solution**:
  1. Terminate the conflicting process, or
  2. Change the port in `engine_config.json` (for Engine: `RESTPort`, `LOCAL_PORT`, `HTTP_PROXY_PORT`) or pass custom ports to CLI:
     ```bash
     proxy-cli start --socks-port 1085 --http-port 8085
     ```

---

## 2. Proxy Connectivity & Upstream Timeouts

### Problem: `proxyconnect tcp: i/o timeout` or `all proxies reported dead`
* **Cause**: The current proxy pool has no reachable proxies due to ISP filtering, firewall blocks, or stale scraped lists.
* **Diagnosis**:
  - Run the diagnostic CLI command to check live pool status:
    ```bash
    proxy-cli pool --alive
    ```
  - Check the Engine REST dashboard at `http://localhost:9090` to observe check failure reasons.
* **Solution**:
  1. Force an instant proxy rotation/re-election:
     ```bash
     proxy-cli rotate --force
     ```
  2. Add verified custom proxies via the Web Dashboard or CLI.
  3. Increase check timeout in `engine_config.json` (`CheckTimeoutSec: 10`).

---

## 3. SQLite Database Locked (`busy_timeout`)

### Problem: `database is locked (5) (SQLITE_BUSY)`
* **Cause**: Concurrent write transactions accessing the SQLite database file (`data/proxy_redirector.db`) simultaneously without WAL mode.
* **Diagnosis**: Verify journal mode on the database file:
  ```bash
  sqlite3 data/proxy_redirector.db "PRAGMA journal_mode;"
  ```
* **Solution**:
  - Ensure the database is opened with WAL mode (`PRAGMA journal_mode=WAL;`) and a busy timeout (`PRAGMA busy_timeout=5000;`).
  - Proxy Redirector automatically enforces WAL mode in `engine/internal/database/sqlite.go`.

---

## 4. SaaS Cloud Backend & Redis Disconnections

### Problem: `ECONNREFUSED 127.0.0.1:6379` or Prisma connection error
* **Cause**: Docker container for Redis or PostgreSQL (Supabase) is stopped or restarting.
* **Diagnosis**:
  ```bash
  docker ps -a --filter "name=supabase"
  ```
* **Solution**:
  1. Restart the Supabase Docker Compose stack:
     ```bash
     cd saas
     docker-compose -f docker-compose.supabase.yml up -d
     ```
  2. Check SaaS API logs:
     ```bash
     npm run dev
     ```

---

## 5. AdBlock Filter Over-Blocking (False Positives)

### Problem: Legitimate domain or website fails to load when proxy is active
* **Cause**: Domain matches an aggressive wildcard block rule (e.g. `*analytics*`).
* **Solution**:
  1. Add the domain to the Whitelist via the embedded Web Dashboard on `http://localhost:9090` (AdBlock Tab), or
  2. Use the REST API:
     ```bash
     curl -X POST http://localhost:9090/api/blocklist/rules \
       -H "Content-Type: application/json" \
       -d '{"action":"add_whitelist","domain":"example.com"}'
     ```

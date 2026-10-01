# ⚙️ Server Daemon & Dynamic Config Subsystems (`engine/cmd/engine/`, `engine/internal/config/`)

The Server subsystem orchestrates daemon startup, gRPC and REST server lifecycles, and atomic JSON configuration persistence.

---

## 1. REST API Endpoints on Port `:9090`

| HTTP Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/status` | Current engine status, active proxy, and pool summary |
| `GET` | `/api/proxies` | Full list of proxies in database with latency and score |
| `GET` | `/api/config` | Current engine configuration |
| `POST`| `/api/config` | Update engine configuration dynamically |
| `GET` | `/api/blocklist`| AdBlock stats, active categories, and whitelist |
| `POST`| `/api/blocklist/rules` | Add or remove exact/wildcard block rules |
| `POST`| `/api/blocklist/toggle`| Toggle specific AdBlock category |
| `POST`| `/api/proxy/select` | Force switch or lock active proxy |
| `POST`| `/api/proxy/add` | Add custom proxy with instant verification |

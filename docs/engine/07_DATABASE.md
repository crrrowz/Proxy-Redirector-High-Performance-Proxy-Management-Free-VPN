# 💾 SQLite WAL Database Subsystem (`engine/internal/database/sqlite.go`)

The SQLite persistence layer provides high-concurrency storage for proxies, reliability metrics, and configuration using Write-Ahead Logging (WAL) mode.

---

## 1. Concurrency Invariants

1. **WAL Mode Enforcement**: Ensures non-blocking concurrent readers while single-writer transactions execute.
2. **Busy Timeout (`5000ms`)**: Queries wait up to 5 seconds to acquire locks before throwing `SQLITE_BUSY` errors.
3. **Automated Legacy Importer (`importer.go`)**: Ingests legacy flat JSON files (`data.json`, `analytics.json`, `blocklist.json`) on initial database boot.

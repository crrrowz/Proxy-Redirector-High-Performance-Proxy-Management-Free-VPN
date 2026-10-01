# 🏊 Proxy Pool Manager Subsystem (`engine/internal/proxy/manager.go`)

The Proxy Pool Manager provides thread-safe in-memory indexing, ranking, and storage coordination for all discovered and custom proxies.

---

## 1. Key Invariants & Algorithms

1. **Thread-Safe Mutex Guarding**: All reads and mutations to the proxy pool are protected via `sync.RWMutex`.
2. **Stickiness Bonus (+1000)**: The currently active proxy receives a +1000 point scoring bonus to prevent connection flapping when candidates have similar latency.
3. **Country & Speed Filtering**: Supports dynamic filtering by ISO 2-letter country code and maximum response time thresholds.

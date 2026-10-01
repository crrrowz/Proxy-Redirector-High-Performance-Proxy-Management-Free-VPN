# ⚡ Failover Handler Subsystem (`engine/internal/failover/handler.go`)

The Failover Handler implements a self-healing circuit breaker that automatically detects proxy drops and switches to the next-best candidate within sub-second time.

---

## 1. Responsibilities & State Machine

1. **Consecutive Failure Tracking**: Increments failure count upon connection drops; triggers failover when exceeding `FAILOVER_MAX_RETRIES` (default: 3).
2. **Second-Chance Retry Timer**: Dead proxies are quarantined for `DEAD_RETRY_AFTER_SECONDS` (default: 120s) before re-entering the testing queue.
3. **Blacklisting**: Proxies that fail repeatedly across multiple retry cycles are permanently blacklisted to prevent wasted bandwidth.

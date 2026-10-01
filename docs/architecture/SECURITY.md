# 🛡️ Security Architecture & Defensive Design

---

## 1. Zero-Trust Security Guarantees

1. **Zero-Leak Failover (`INV-SEC-01`)**:
   - In-flight TCP socket connections terminate gracefully upon proxy rotation or failure; all subsequent DNS/TCP requests immediately target the newly elected proxy.
2. **Credential Sanitization (`INV-SEC-02`)**:
   - Proxy authentication strings (usernames, passwords) and JWT tokens are stripped before writing to structured logs.
3. **Idempotency & Replay Defense (`INV-SEC-03`)**:
   - All state-mutating SaaS endpoints (`POST /api/v1/billing/checkout`) require `Idempotency-Key` headers backed by Redis with a 24-hour TTL.
4. **Subnet Confinement & LAN Whitelisting (`INV-SEC-04`)**:
   - SOCKS5 and HTTP proxy listeners (`0.0.0.0`) permit LAN connections (`192.168.0.0/16`, `10.0.0.0/8`, `127.0.0.1`) only when authorized or managed via the client device tracker.
5. **No Dangerous Code Execution (`INV-SEC-05`)**:
   - The codebase strictly avoids dynamic code execution (`eval()`, unparameterized shell calls with `shell=True`, or dynamic SQL string concatenation).

# 📝 Error Logging & Observability Standard

---

## 1. Unified Logging Standard

The system uses modern structured logging across all components:
- **Go Engine & Client**: Go standard library `log/slog` with JSON output in production and colored text output in local development.
- **Node.js SaaS Backend**: `pino` structured logger with `pino-pretty` formatting.

```json
{
  "time": "2026-10-01T14:30:00Z",
  "level": "INFO",
  "msg": "Proxy failover triggered",
  "failed_proxy_id": "103.152.112.186_8080",
  "new_proxy_id": "185.199.229.156_1080",
  "latency_ms": 34.2
}
```

---

## 2. Standardized Error Contracts (RFC 7807)

All SaaS API errors adhere to the **RFC 7807 Problem Details** specification (`application/problem+json`):

```json
{
  "type": "https://api.proxyredirector.io/errors/validation-failed",
  "title": "Validation Failed",
  "status": 422,
  "code": "INVALID_PAYLOAD",
  "detail": "One or more input fields failed validation.",
  "instance": "/api/v1/auth/register",
  "requestId": "req_01HPX789ABCD"
}
```

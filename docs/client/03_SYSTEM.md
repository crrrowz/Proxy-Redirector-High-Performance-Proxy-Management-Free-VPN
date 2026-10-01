# 🔌 Local Relay & System Integration Subsystems (`client/internal/proxy/`)

The local relay subsystem exposes standard network socket proxy ports on the user machine.

---

## 1. Local Ingress Servers

1. **SOCKS5 Server (`:1080`)**: Listens on `0.0.0.0:1080` supporting RFC 1928 SOCKS5 tunneling with optional username/password authentication.
2. **HTTP CONNECT Proxy (`:8080`)**: Listens on `0.0.0.0:8080` handling HTTPS CONNECT tunneling and plain HTTP forwarding.
3. **LAN Whitelist Bypass**: Connections originating from private RFC 1918 subnets (`192.168.0.0/16`, `10.0.0.0/8`, `127.0.0.1`) can bypass authentication when configured.

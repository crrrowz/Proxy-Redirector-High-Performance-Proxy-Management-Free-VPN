# 🔍 Proxy Checker Subsystem (`engine/internal/proxy/checker.go`)

The Proxy Checker is an asynchronous, multi-threaded worker pool responsible for validating proxy health, latency, SSL support, and anonymity levels.

---

## 1. Capabilities & Logic

1. **Multi-Protocol Support**: Tests SOCKS5, SOCKS4, HTTP, and HTTPS proxies.
2. **Latency Probing**: Measures round-trip time in milliseconds ($ms$) using synthetic HTTP GET requests.
3. **SSL / HTTPS Verification**: Confirms whether the proxy can establish TLS handshakes to secure HTTPS endpoints.
4. **Anonymity Level Detection**:
   - **Transparent**: User's real IP address is exposed in `Via` or `X-Forwarded-For` headers.
   - **Anonymous**: Real IP is concealed, but proxy forwarding headers indicate proxy presence.
   - **Elite**: Real IP is completely hidden and no proxy signatures are detectable.

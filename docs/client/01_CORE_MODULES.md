# 🧩 Client Core Modules (`client/internal/core/`)

The Client Core package encapsulates 100% of the proxy routing, Surge rotation, and status querying logic shared between the Wails desktop GUI and the standalone headless CLI (`proxy-cli`).

---

## 1. Responsibilities

1. **gRPC Connection Orchestration**: Connects to the local Go Engine daemon (`127.0.0.1:50051`) via `engine.GRPCClient`.
2. **Relay Server Control**: Manages lifecycle of local SOCKS5 (`:1080`) and HTTP CONNECT (`:8080`) proxy relays.
3. **Surge Dynamic Rotation**: Toggles and configures automatic rotation modes (interval, request count, lowest ping).

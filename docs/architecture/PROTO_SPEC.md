# 📋 Protobuf & gRPC Specification

> **Protobuf Contract Path**: `proto/engine/v1/engine.proto`

---

## 1. Primary Service: `ProxyEngine`

The `ProxyEngine` service defines the core RPC interface between `Engine.exe` (Daemon) and `Client.exe` (Wails GUI / CLI):

### Connection Lifecycle RPCs
| Method | Request / Response | Description |
| :--- | :--- | :--- |
| `Connect` | `ConnectRequest → ConnectResponse` | Connects to the optimal proxy in a given region. Returns relay info in SaaS mode. |
| `Disconnect` | `DisconnectRequest → DisconnectResponse` | Disconnects the active proxy session and records bandwidth telemetry. |

### Proxy Query & Stream RPCs
| Method | Request / Response | Description |
| :--- | :--- | :--- |
| `GetActiveProxy` | `Empty → ProxyInfo` | Returns the currently active proxy representation. |
| `StreamProxyUpdates` | `Empty → stream ProxyUpdate` | Server-side stream broadcasting proxy state changes, failover events, and health updates. |
| `GetProxies` | `GetProxiesRequest → GetProxiesResponse` | Lists proxies from the pool with optional country and limit filters. |

### Pool, AdBlock & Configuration RPCs
| Method | Request / Response | Description |
| :--- | :--- | :--- |
| `GetEngineStatus` | `Empty → EngineStatus` | Returns engine state, ports, pool statistics, and discovery progress. |
| `GetPoolSummary` | `Empty → PoolSummary` | Returns total, alive, dead, and retryable proxy counts. |
| `CheckDomain` | `DomainCheckRequest → DomainCheckResponse` | Queries the AdBlock engine to determine if a domain is blocked. |
| `ToggleAdBlock` | `ToggleRequest → ToggleResponse` | Enables or disables the AdBlock engine globally or by category. |
| `GetBlockStats` | `Empty → BlockStats` | Returns total blocked queries, active rules, and whitelist counts. |
| `EnableRotation` | `RotationConfig → RotationStatus` | Activates Surge dynamic rotation with custom intervals and pool filters. |
| `DisableRotation` | `Empty → RotationStatus` | Deactivates dynamic rotation. |
| `GetConfig` | `Empty → ConfigResponse` | Retrieves the key-value configuration map. |
| `UpdateConfig` | `UpdateConfigRequest → ConfigResponse` | Updates engine parameters dynamically. |

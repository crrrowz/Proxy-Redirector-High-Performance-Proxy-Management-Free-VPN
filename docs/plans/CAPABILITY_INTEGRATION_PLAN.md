# 🏛️ SYSTEM-WIDE CAPABILITY INTEGRATION BLUEPRINT & ARCHITECTURE SPECIFICATION

**Document ID**: `DOC-ARCH-CAPABILITY-INTEGRATION-V1`  
**System Name**: Proxy Management & Free VPN (`Proxy Redirector Ecosystem`)  
**Architect**: Principal Systems Architect & Network Systems Engineer  
**Classification**: Production-Grade Open-Source System Architecture Blueprint  
**Status**: APPROVED ARCHITECTURAL SPECIFICATION & GAP AUDIT (READY FOR PHASED IMPLEMENTATION)

---

## 1. Executive Summary

A comprehensive architectural reconnaissance of the `Proxy_redirector` ecosystem was conducted across the Go Core Engine (`engine/`), Dual Go Client layer (`client/`), shared models/Protobuf (`shared/`), and Cloud SaaS platform (`saas/`).

The system currently operates as a local SOCKS5/HTTP forwarder and proxy pool rotator backed by an SQLite WAL database (`engine/internal/database/sqlite.go`), multi-threaded HTTP latency prober (`engine/internal/proxy/checker.go`), domain AdBlock engine (`engine/internal/adblock/engine.go`), and single-active failover controller (`engine/internal/failover/handler.go`).

To evolve the codebase into an enterprise-grade, rule-driven, transparent proxy platform matching modern networking stacks (e.g., Clash/Sing-box/Surge capabilities), this blueprint provides the definitive architectural decomposition, capability gap analysis, and phased evolutionary implementation roadmap across 12 capability domains:
1. High Performance & Stability
2. Flexible Rule System
3. Standards-Based Proxying
4. Popular Proxy Protocols
5. Smart Group / Adaptive Policy Selection
6. Complete DNS Suite
7. HTTPS Decryption / MITM Debugging
8. Rewrite & Scripting
9. Device-to-Device Networking / Secure P2P Mesh
10. Enhanced Mode / Full Traffic Capture (TUN)
11. Gateway Mode / LAN Gateway
12. Remote Dashboard & Telemetry Streaming

---

## 2. Current System Architecture

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT TIER (GUI & CLI)                                  │
│                                                                                        │
│   ┌───────────────────────────┐                      ┌──────────────────────────────┐  │
│   │  Wails Desktop GUI (React)│                      │ Standalone CLI (`proxy-cli`) │  │
│   └─────────────┬─────────────┘                      └──────────────┬───────────────┘  │
│                 │                                                   │                  │
│                 └─────────────────────┬─────────────────────────────┘                  │
│                                       ▼                                                │
│                     ┌───────────────────────────────────┐                              │
│                     │     Client Core (client/core)     │                              │
│                     │ - Local SOCKS5 Proxy (:1080)      │                              │
│                     │ - Local HTTP Proxy (:8080)        │                              │
│                     │ - LAN ClientTracker (IP Whitelist)│                              │
│                     └─────────────────┬─────────────────┘                              │
│                                       │ gRPC (:50051)                                  │
├───────────────────────────────────────┼────────────────────────────────────────────────┤
│                                       ▼                                                │
│                     ┌───────────────────────────────────┐                              │
│                     │  Go Engine Daemon (engine/cmd)    │                              │
│                     │ - GRPCServer / RESTServer (:9090) │                              │
│                     │ - AdBlock Engine (Domain/Wildcard)│                              │
│                     │ - Failover Handler (Single Best)  │                              │
│                     │ - Proxy Manager & Rotator         │                              │
│                     │ - SQLite WAL (proxies, metrics)   │                              │
│                     └─────────────────┬─────────────────┘                              │
│                                       │ Dialer (Direct / Single Active Proxy)          │
└───────────────────────────────────────┼────────────────────────────────────────────────┘
                                        ▼
                         [Outbound Internet / Target Host]
```

### Current Subsystem Analysis:
* **Ingress**: `client/internal/proxy/socks5.go` and `client/internal/proxy/http_proxy.go`. Both listen on `0.0.0.0` and handle incoming connections on separate ports. They forward all allowed traffic to a single active proxy obtained via gRPC from the Engine (`s.engineCtrl.GetActiveProxy()`).
* **Routing & Filtering**: Filtering is restricted to `engine/internal/adblock/engine.go` via domain exact matches and substring wildcards. If a domain is blocked, the request drops; otherwise, it is directed to the current active proxy. Multi-outbound policy routing is absent.
* **Outbound Dialing**: Dialing is hardcoded to `golang.org/x/net/proxy` SOCKS5 or basic HTTP CONNECT (`dialHTTPConnect` in `client/internal/proxy/http_connect.go`).
* **State & Failover**: Failover selects one global active proxy based on `Score` calculation in `engine/internal/proxy/manager.go:301-342`. Surge Mode advances a single active proxy index.

---

## 3. Current Capability Inventory

| Domain | Inventory Status | Concrete Codebase Location & Findings |
| :--- | :--- | :--- |
| **Ingress Protocols** | Existing (Basic) | SOCKS5 (`client/internal/proxy/socks5.go`), HTTP/CONNECT (`client/internal/proxy/http_proxy.go`). No SOCKS5 UDP Associate, no Mixed Port, no Redir/TPROXY, no TUN. |
| **Outbound Protocols**| Existing (Basic) | SOCKS5, SOCKS4, HTTP CONNECT. No Shadowsocks, Trojan, WireGuard, Hysteria2, VMess/VLESS, SSH tunnel. |
| **Rule Matching** | Partial (AdBlock only)| Domain exact match, parent domain, wildcard substring (`engine/internal/adblock/engine.go`). No IP-CIDR, GeoIP, ASN, Process Name, Port, Logical Operators (AND/OR/NOT). |
| **Routing / Policies**| Partial (Single Active)| 1 Active proxy selected by failover or rotator. No Rule-Based Routing, no Multi-Outbound, no Proxy Groups (`Select`, `URLTest`, `Fallback`, `LoadBalance`). |
| **Health Checking** | Existing | Async batch HTTP probe (`engine/internal/proxy/checker.go`) against `httpbin.org/ip` or custom endpoint. |
| **Persistence** | Existing | SQLite WAL mode (`engine/internal/database/sqlite.go`) and JSON fallback (`engine/data/data.json`). |
| **DNS Resolution** | Missing / OS-only | System standard resolver (`net.Dial`). No DoH, DoT, DoQ, Fake-IP pool, or split-DNS routing. |
| **Traffic Capture** | Missing / Explicit only| Manual proxy configuration on OS/browser. No TUN interface (`wintun`/`tun`), no Packet Redirection. |
| **Decryption / MITM** | Missing | No root CA generation, dynamic TLS interception, or HTTP request/response modification. |
| **Scripting / VM** | Missing | No JavaScript/Lua engine, URL rewriting, or programmable hook system. |
| **Gateway Mode** | Partial (LAN Listener)| Listens on `0.0.0.0` with IP tracker (`client/internal/proxy/tracker.go`). Missing DHCP, NAT/TPROXY forwarding, and per-device MAC/IP policy binding. |
| **P2P Networking** | Missing | No STUN/ICE NAT traversal, WireGuard/Noise mesh, or DERP relay protocol. |
| **Management API** | Existing | gRPC (`engine/internal/server/grpc_server.go`) + REST API (`engine/internal/server/rest_api.go`) + Embedded UI (`engine/static/`). |

---

## 4. Requested Capability Decomposition

### 4.1 High Performance & Stability
* **Connection Lifecycle**: Multiplexed transport pools, zero-copy buffer pooling (`sync.Pool` for 32KB/64KB slices), context cancellation propagation.
* **TCP/UDP Buffer Management**: `io.CopyBuffer` with pooled memory, ring buffers, backpressure handling for asymmetric bandwidth.
* **Concurrency Limits**: Adaptive worker pools, per-host connection rate limiting, panic boundary isolation.

### 4.2 Flexible Rule System
* **Match Primitives**: `DOMAIN`, `DOMAIN-SUFFIX`, `DOMAIN-KEYWORD`, `IP-CIDR` (IPv4/IPv6), `GEOIP`, `ASN`, `PROCESS-NAME`, `PROCESS-PATH`, `PORT`, `PORT-RANGE`, `NETWORK` (TCP/UDP), `IN-PORT`, `PROTOCOL` (HTTP/TLS/QUIC).
* **Logical Operators & Sets**: `AND`, `OR`, `NOT`, Sub-rulesets (`RULE-SET`), Remote Rule Providers (YAML/Binary with auto-update and SHA256 verification).
* **Compilation & Indexing**: Radix Trie for domain lookup, Patricia Trie / LC-Trie for IP-CIDR lookup, Aho-Corasick for keyword matching ($O(1)$ evaluation).

### 4.3 Standards-Based & Modern Proxy Protocols
* **Inbound Transports**: Mixed Port (auto HTTP/SOCKS5 on same port), SOCKS5 (TCP CONNECT + UDP ASSOCIATE), HTTP/1.1 & HTTP/2 CONNECT, Transparent Redir/TPROXY, TUN Interface.
* **Outbound Protocols**:
  * Standards: `Direct`, `Reject`, `SOCKS5`, `SOCKS5-TLS`, `HTTP`, `HTTPS (HTTP/2)`, `SSH Tunnel`.
  * Encrypted/Circumvention: `Shadowsocks` (AEAD ciphers), `Trojan` (TLS/gRPC/WebSocket), `WireGuard` (Kernel/Userspace Go), `Hysteria 2` (QUIC/UDP congestion), `Snell`, `MASQUE` / `HTTP/3 CONNECT`.
  * Chaining: Arbitrary proxy multi-hop nesting ($Client \to ProxyA \to ProxyB \to Target$).

### 4.4 Smart Group & Adaptive Policy Engine
* **Group Types**: `select` (Manual GUI/API choice), `url-test` (Lowest latency with tolerance window), `fallback` (Priority ordered health-failover), `load-balance` (Round-robin / Consistent Hashing), `relay` (Sequential multi-hop chaining).
* **Metrics & Hysteresis**: Passive latency tracking on live streams + active probing with exponential moving average (EMA), failure cooldown, flap prevention thresholds.

### 4.5 Complete DNS Suite
* **Transports**: Standard UDP/TCP (`53`), DNS-over-HTTPS (`DoH`), DNS-over-TLS (`DoT`), DNS-over-QUIC (`DoQ`), DNS-over-HTTP/3.
* **Architecture**: Fake-IP pool allocator (`198.18.0.0/15`) for instant zero-RTT proxy tunneling; Split-DNS router (route DNS queries based on domain rules to specific encrypted resolvers); In-memory TTL cache with negative caching.

### 4.6 HTTPS Decryption / MITM Debugging
* **Cert Engine**: Dynamic Root CA generation and secure local storage; on-the-fly leaf certificate minting with SNI caching and SAN extensions.
* **Interception Pipeline**: HTTP/1.1 & HTTP/2 stream parsing, header inspection, body decoding (gzip, brotli, zstd), selective SNI bypass list.

### 4.7 Rewrite & Scripting Engine
* **URL/Header Rewrite**: Regex path replacement, header insertion/removal/mutation, status code overrides, mock static responses.
* **Sandboxed Scripting**: Embedded lightweight JS runtime (e.g., `goja`) with strict timeout (e.g., 50ms), memory limits (e.g., 8MB), and no OS/file system access.

### 4.8 Enhanced Mode / Full Traffic Capture (TUN)
* **Virtual Network Adapter**: Wintun (Windows), Water/Tun (Linux/macOS) capturing Layer 3 IP packets.
* **TCP/UDP Stack**: Userspace TCP/IP stack (`gVisor / netstack` or `lwIP`) converting raw IP packets into standard Go `net.Conn` and `net.PacketConn`.
* **Process Attribution**: OS-level socket interrogation (Windows `GetExtendedTcpTable`, Linux `/proc/net`, macOS `sysctl`) for process-name routing.

### 4.9 Gateway Mode / LAN Gateway
* **Virtual Router**: ARP responder, default gateway IP assignment, NAT/Packet forwarding.
* **Per-Device Accounting**: Client identification by MAC and IP, device grouping, per-device policy routing and bandwidth quotas.

### 4.10 Device-to-Device / Secure P2P Mesh
* **Mesh Network**: WireGuard-based or Noise-protocol peer-to-peer overlay.
* **Discovery & Traversal**: STUN NAT discovery, UPnP/PMP port mapping, DERP/Relay fallback nodes when direct UDP is blocked.

### 4.11 Remote Dashboard & Observability
* **Real-Time Streaming**: WebSocket event stream (`/ws/traffic`, `/ws/logs`, `/ws/connections`).
* **Connection Inspector**: Active connection tracking table (Source IP, Process, Inbound, Target, Rule Matched, Outbound Chain, Upload/Download Bytes, Latency).
* **Routing Explainability**: Trace endpoint (`GET /api/v1/rules/match?host=x&port=y`) explaining exact rule evaluation path.

---

## 5. Capability Gap Matrix

| Capability | Status | Relevant Components | Identified Architectural Gap | Required Architectural Changes | Risk Level |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **High Performance I/O** | Partial | `client/internal/proxy/socks5.go`, `http_proxy.go` | Raw `io.Copy` allocates new 32KB buffers per connection. No zero-copy buffer pooling. Unbounded goroutine spawns per accept. | Introduce centralized `buffer.Pool`, connection tracker, and rate-limited worker dispatchers. | Low |
| **Flexible Rule Engine** | Missing | `engine/internal/adblock/engine.go` | AdBlock is a domain blacklist table with binary drop. No multi-attribute matchers (IP, CIDR, Port, GeoIP, Process, Protocol) or multi-outbound routing. | Implement AST-compiled Rule Engine with Radix Trie (Domain) and Patricia Trie (IP-CIDR) returning target Outbound Policy. | Medium |
| **Proxy Protocols** | Partial | `client/internal/proxy/socks5.go`, `http_connect.go` | Hardcoded SOCKS5/HTTP client. No extensible `OutboundAdapter` interface. No Shadowsocks, Trojan, WireGuard, Hysteria2. | Extract unified `Outbound` interface (`DialContext`, `DialPacketConnContext`); build protocol adapters in `engine/internal/outbound/`. | Medium |
| **Proxy Groups / Smart Policies**| Partial | `engine/internal/proxy/manager.go`, `failover/handler.go` | Only 1 global active proxy. No named groups (`ProxyGroup`), no dynamic URL-Test, Fallback, LoadBalance, or Relay chaining. | Implement `PolicyGroup` abstractions with active/passive health scoring, circuit breakers, and sub-policy resolution. | Medium |
| **Encrypted & Split DNS** | Missing | `engine/`, `client/` | Resolves via standard OS resolver (`net.Dial`). No DoH, DoT, DoQ, Fake-IP, or rule-based DNS upstream selection. | Build `dns.Engine` with transport providers (UDP, DoH, DoT, DoQ), Fake-IP address allocator, and Split-DNS routing table. | High |
| **HTTPS Interception (MITM)**| Missing | None | No TLS interception or certificate management facilities exist in engine or client. | Introduce `mitm.Engine` with Certificate Authority generation, leaf cert LRU cache, and HTTP/1.1 & H2 proxy filter pipeline. | High |
| **Rewrite & Scripting** | Missing | None | No request/response mutation pipeline or embedded scripting VM. | Implement HTTP middleware interceptor hooks and embed a sandboxed JS engine (`goja`) with resource quotas. | Medium |
| **Enhanced Mode (TUN)** | Missing | None | No virtual network interface driver or userspace TCP/IP stack. User must manually set HTTP/SOCKS proxy. | Integrate `wintun` (Windows) / `tun` (Unix) with `gVisor/netstack` to convert Layer 3 IP packets into Go TCP/UDP streams. | High |
| **Gateway Mode** | Partial | `client/internal/proxy/tracker.go` | Tracker only records IP/hostname of connections hitting `:1080`/`:8080`. No packet forwarding or per-device routing policies. | Integrate transparent interception (TPROXY/NAT) and per-device policy routing table indexed by MAC/IP. | High |
| **Secure P2P Mesh** | Missing | None | No NAT traversal, Noise protocol, or peer overlay engine. | Introduce `mesh.Engine` integrating user-space WireGuard / DERP relay coordination. | High |
| **Remote Dashboard & Streaming**| Partial | `engine/internal/server/rest_api.go`, `grpc_server.go` | Dashboard is static polling. No live connection inspector, rule debugger, or real-time WebSocket telemetry stream. | Add WebSocket hub (`/ws/traffic`, `/ws/connections`), Connection Tracker with live byte counters, and Rule Match debugger. | Low |

---

## 6. Target Architecture & Layer Topology

```text
                              ┌────────────────────────────────────────────────────────┐
                              │                   INGRESS LAYER                        │
                              │  - Mixed Port (:7890 HTTP+SOCKS5)                      │
                              │  - SOCKS5 (:1080 TCP+UDP) / HTTP CONNECT (:8080)       │
                              │  - Enhanced TUN Adapter (Wintun / Linux TUN)           │
                              │  - Transparent Gateway Ingress (TPROXY / NAT)          │
                              └──────────────────────────┬─────────────────────────────┘
                                                         │ Raw TCP Stream / UDP Packet
                                                         ▼
                              ┌────────────────────────────────────────────────────────┐
                              │            SESSION & CONTEXT METADATA                  │
                              │  Source IP, Source Port, Dest IP, Dest Port, Process,  │
                              │  Inbound Type, Hostname (SNI / HTTP Host / Fake-IP)    │
                              └──────────────────────────┬─────────────────────────────┘
                                                         │
                                                         ▼
                              ┌────────────────────────────────────────────────────────┐
                              │             DNS & PROTOCOL DETECTION                   │
                              │  - Fake-IP Reverse Resolution Pool (198.18.0.0/15)     │
                              │  - Sniffer: TLS ClientHello SNI / HTTP Host Header     │
                              │  - Split-DNS Subsystem (DoH, DoT, DoQ, UDP)            │
                              └──────────────────────────┬─────────────────────────────┘
                                                         │
                                                         ▼
                              ┌────────────────────────────────────────────────────────┐
                              │                 RULE ROUTING ENGINE                    │
                              │  - Fast Radix Trie (Domain, Suffix, Keyword)           │
                              │  - Patricia Trie (IP-CIDR v4/v6, GeoIP, ASN)           │
                              │  - Process Matcher, Port Matcher, Logical (AND/OR/NOT) │
                              │  - Remote / Local Rule-Sets Compilation Cache          │
                              └──────────────────────────┬─────────────────────────────┘
                                                         │ Evaluates to Target Outbound / Group
                                                         ▼
                              ┌────────────────────────────────────────────────────────┐
                              │           POLICY & SMART GROUP ENGINE                  │
                              │  - Groups: Select, URL-Test, Fallback, Load-Balance    │
                              │  - Passive Latency + Active Prober (EMA Scoring)       │
                              │  - Circuit Breakers & Flap Prevention Hysteresis       │
                              └──────────────────────────┬─────────────────────────────┘
                                                         │ Resolved Leaf Outbound Adapter
                                                         ▼
                              ┌────────────────────────────────────────────────────────┐
                              │               INTERCEPTOR / MITM PIPELINE              │
                              │  - (Optional) TLS Termination & Decryption (Root CA)   │
                              │  - URL Rewrite & Header Mutation                       │
                              │  - Sandboxed JavaScript VM (goja) Engine Execution     │
                              └──────────────────────────┬─────────────────────────────┘
                                                         │
                                                         ▼
                              ┌────────────────────────────────────────────────────────┐
                              │                OUTBOUND ADAPTER LAYER                  │
                              │  - Direct / Reject                                     │
                              │  - SOCKS5 / SOCKS5-TLS / HTTP / HTTPS                  │
                              │  - Shadowsocks (AEAD), Trojan, WireGuard, Hysteria 2   │
                              │  - Proxy Chains (A -> B -> C)                          │
                              │  - P2P Mesh Overlay (Noise / STUN / Relay)             │
                              └──────────────────────────┬─────────────────────────────┘
                                                         │
                                                         ▼
                                             [ Target Destination ]

═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
                                   CROSS-CUTTING INFRASTRUCTURE
 ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────────────┐
 │ Configuration Engine │  │ Observability Engine │  │ Buffer & Conn Pool   │  │  Management API & Stream UI  │
 │ Hot Reload / Storage │  │ Tracing, Logs, Stats │  │ sync.Pool 64KB Ring  │  │  WebSocket, REST, gRPC, UI   │
 └──────────────────────┘  └──────────────────────┘  └──────────────────────┘  └──────────────────────────────┘
```

---

## 7. Core Abstractions & Interfaces

```go
package core

import (
	"context"
	"net"
	"time"
)

// SessionContext encapsulates all metadata for a routed connection.
type SessionContext struct {
	ID          string
	InboundType string // "socks5", "http", "mixed", "tun", "tproxy"
	SrcIP       net.IP
	SrcPort     uint16
	DstIP       net.IP
	DstPort     uint16
	Host        string // Resolved domain or SNI
	ProcessName string
	ProcessPath string
	Network     string // "tcp" or "udp"
	FakeIP      bool
	StartTime   time.Time
	MatchedRule string
	OutboundTag string
}

// Inbound represents a traffic ingress listener.
type Inbound interface {
	Tag() string
	Type() string
	Address() string
	Start(router Router) error
	Close() error
}

// Outbound represents any egress destination or proxy protocol.
type Outbound interface {
	Tag() string
	Type() string
	DialContext(ctx context.Context, session *SessionContext) (net.Conn, error)
	DialPacketConn(ctx context.Context, session *SessionContext) (net.PacketConn, error)
	HealthCheck(ctx context.Context) (time.Duration, error)
}

// PolicyGroup represents a group outbound with dynamic selection logic.
type PolicyGroup interface {
	Outbound
	SelectedOutbound(session *SessionContext) Outbound
	AllOutbounds() []Outbound
	SetSelection(tag string) error
}

// Rule represents an abstract routing rule.
type Rule interface {
	Match(session *SessionContext) bool
	TargetOutboundTag() string
	Payload() string
}

// Router evaluates session metadata against ordered rules.
type Router interface {
	Route(session *SessionContext) (Outbound, error)
	Explain(session *SessionContext) (matchedRule Rule, outbound Outbound, err error)
}
```

---

## 8. Implementation Dependency Graph

```text
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 1: Core Networking Primitives, Buffer Pools & Outbound Abstraction│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 2: Protocol Outbound Adapters (Shadowsocks, Trojan, WireGuard, etc)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 3: High-Speed AST Rule Engine & Indexing (Radix, Patricia, GeoIP)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 4: Policy Groups (Select, URL-Test, Fallback, Load-Balance, Relay)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 5: Complete DNS Suite (DoH, DoT, DoQ, Split-DNS & Fake-IP Engine)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 6: Ingress Unification (Mixed Port :7890, SOCKS5 UDP, HTTP)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 7: Enhanced Mode (Wintun / TUN Driver & gVisor TCP/IP Stack)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 8: HTTPS Decryption (MITM) & Sandboxed Scripting / Rewriting VM  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 9: Gateway Mode & LAN Device Policy Routing                      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 10: Device-to-Device P2P WireGuard Mesh & SaaS Relay Sync        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ PHASE 11: Real-Time Telemetry, WebSocket Hub & Next-Gen Dashboard UI   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Incremental Implementation Phases

### Phase 1: Foundation Abstractions & Buffer Pooling
* **Objective**: Establish `Outbound`, `Inbound`, `SessionContext`, and `buffer.Pool`.
* **Directories Affected**: `engine/internal/core/`, `shared/models/`.
* **Completion Criteria**: Unit tests confirm zero-copy buffer allocations and clean mock outbound dispatch.

### Phase 2: Modern Proxy Protocol Outbound Adapters
* **Objective**: Implement `Direct`, `Reject`, `SOCKS5(UDP)`, `Shadowsocks`, `Trojan`, `WireGuard`, and `Hysteria2`.
* **Directories Affected**: `engine/internal/outbound/`.
* **Completion Criteria**: Integration tests verify bidirectional traffic across each protocol.

### Phase 3: High-Speed AST Rule Engine
* **Objective**: Build domain Radix tree, IP-CIDR Patricia trie, GeoIP, process matchers, and rule compiler.
* **Directories Affected**: `engine/internal/rules/`.
* **Completion Criteria**: 100,000 rules evaluated in $<0.1\text{ ms}$.

### Phase 4: Policy & Smart Group Engine
* **Objective**: Implement `Select`, `URLTest`, `Fallback`, `LoadBalance`, and `Relay` with EMA latency tracking.
* **Directories Affected**: `engine/internal/policy/`.
* **Completion Criteria**: URLTest switches to fastest proxy within configured tolerance window with no flapping.

### Phase 5: Complete DNS Suite & Fake-IP Engine
* **Objective**: Implement DoH/DoT/DoQ, Fake-IP allocator pool (`198.18.0.0/15`), and Split-DNS routing.
* **Directories Affected**: `engine/internal/dns/`.
* **Completion Criteria**: Instant Fake-IP return and successful reverse lookup upon inbound TCP connect.

### Phase 6: Unified Ingress Stack
* **Objective**: Implement Mixed Port (`HTTP+SOCKS5` on `:7890`) and Redir/TPROXY listeners.
* **Directories Affected**: `engine/internal/inbound/`.
* **Completion Criteria**: Both HTTP and SOCKS5 clients connect to the same port and route according to rules.

### Phase 7: Enhanced Mode (TUN Adapter)
* **Objective**: Integrate `wintun` and `gVisor/netstack` with OS socket process attribution.
* **Directories Affected**: `engine/internal/tun/`.
* **Completion Criteria**: System-wide non-proxy-aware traffic captured and routed transparently with process names.

### Phase 8: HTTPS Decryption (MITM) & Scripting VM
* **Objective**: Implement dynamic CA leaf generator, HTTP/1.1 & H2 stream modifiers, and `goja` JS sandbox.
* **Directories Affected**: `engine/internal/mitm/`, `engine/internal/scripting/`.
* **Completion Criteria**: HTTPS requests intercepted, modified by JS script, and successfully forwarded.

### Phase 9: Gateway Mode & Device Policy Engine
* **Objective**: Implement LAN packet forwarding, ARP identification, and per-device policy routing.
* **Directories Affected**: `engine/internal/gateway/`.
* **Completion Criteria**: Separate LAN devices route through distinct outbound proxies based on MAC/IP.

### Phase 10: P2P WireGuard Mesh Networking
* **Objective**: Integrate peer-to-peer WireGuard engine with STUN NAT traversal and DERP relay fallback.
* **Directories Affected**: `engine/internal/mesh/`.
* **Completion Criteria**: Direct P2P tunnel established between two isolated nodes behind NAT.

### Phase 11: Real-Time Observability & Dashboard Evolution
* **Objective**: Implement WebSocket streaming hub, connection tracker, and real-time dashboard UI.
* **Directories Affected**: `engine/internal/server/`, `engine/static/`, `client/frontend/`.
* **Completion Criteria**: Real-time traffic graphs, active connection table, and rule-matching trace in UI.

---

## 10. Risk Register & Mitigation Strategy

| Risk ID | Description | Severity | Probability | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **RSK-01** | Wintun / TUN driver installation requires admin privileges on Windows. | High | High | Graceful fallback to System Proxy mode if TUN driver fails to install or lacks elevated permissions. |
| **RSK-02** | Anti-cheat / Security software flags MITM root CA certificate. | High | Medium | Explicit user consent dialog; MITM disabled by default; strict built-in bypass rules for gaming and banking. |
| **RSK-03** | Fake-IP address collisions with local subnets. | Medium | Low | Use standard reserved documentation subnet `198.18.0.0/15` (RFC 2544 / RFC 5735 Benchmark range). |
| **RSK-04** | High memory usage during heavy multi-stream UDP traffic. | Medium | Medium | Implement strict UDP session timeouts and pooled packet buffers with upper bounds. |
| **RSK-05** | Backward compatibility breakage with existing Wails GUI or SaaS API. | Critical | Low | Maintain legacy gRPC protobuf schemas and REST routes mapped to the new routing engine. |

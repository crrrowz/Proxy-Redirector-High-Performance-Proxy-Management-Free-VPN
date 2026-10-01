# ☁️ Engine Module: Relay Server

> **ملف Go المستهدف:** `engine/internal/relay/server.go` + `tunnel.go`
> **مرجع:** `saas/FULL_PLAN.md` — قسم Relay Server

---

## الوظيفة

Relay Server هو وسيط بين Client.exe والإنترنت:
- يستقبل TLS tunnel من Client
- يوجّه الحركة عبر بروكسيات مُدارة
- يخفي عنوان البروكسي الحقيقي عن العميل

---

## المعمارية

```
Client.exe ──TLS 1.3──► Relay Server ──► Proxy ──► الإنترنت
                              │
                              │ gRPC (internal)
                              ▼
                        Engine (Central API)
                        يتحقق من session_token
                        يختار البروكسي المناسب
```

---

## الواجهة

```go
type RelayServer struct {
    listener     net.Listener
    engineClient enginev1.ProxyEngineClient  // gRPC client داخلي
    tlsConfig    *tls.Config
    activeTunnels map[string]*Tunnel
    mu           sync.RWMutex
    maxConns     int
    region       string
    hostname     string
}

type Tunnel struct {
    SessionID   string
    UserID      string
    ClientConn  net.Conn
    ProxyDialer proxy.Dialer
    BytesUp     int64
    BytesDown   int64
    CreatedAt   time.Time
}

func NewRelayServer(cfg RelayConfig) *RelayServer
func (r *RelayServer) Start() error
func (r *RelayServer) Stop()
func (r *RelayServer) ActiveConnections() int
func (r *RelayServer) LoadPercent() int
```

### تسلسل الاتصال
```
1. Client يتصل بـ TLS listener
2. Client يرسل session_token (أول 4 bytes = length, ثم token)
3. Relay يتحقق من Token عبر gRPC إلى Engine:
   rpc ValidateSessionToken(token) → (user_id, session_id, proxy_info)
4. إذا صالح → Relay يفتح اتصال بالبروكسي المحدد
5. Relay ينسخ البيانات ثنائي الاتجاه:
   Client ←→ Relay ←→ Proxy ←→ الإنترنت
6. Relay يحسب bytes ويرسلها لـ Engine كل 30 ثانية
```

### Heartbeat
```go
// كل 30 ثانية يرسل Relay تقرير لـ Engine
func (r *RelayServer) heartbeat() {
    ticker := time.NewTicker(30 * time.Second)
    for range ticker.C {
        r.engineClient.RelayHeartbeat(&RelayHeartbeat{
            Hostname:    r.hostname,
            Region:      r.region,
            Connections: r.ActiveConnections(),
            LoadPct:     r.LoadPercent(),
        })
    }
}
```

---

## RelayConfig

```go
type RelayConfig struct {
    ListenPort      int      `json:"listen_port"`       // 443
    TLSCertFile     string   `json:"tls_cert_file"`
    TLSKeyFile      string   `json:"tls_key_file"`
    EngineGRPCAddr  string   `json:"engine_grpc_addr"`  // "engine:50051"
    MaxConnections  int      `json:"max_connections"`    // 1000
    Region          string   `json:"region"`             // "US"
    Hostname        string   `json:"hostname"`           // "us-east-1.relay.proxyredirector.com"
}
```

---

## Deployment

```
كل منطقة = VPS واحد أو أكثر:
├── US East  → us-east.relay.proxyredirector.com
├── US West  → us-west.relay.proxyredirector.com
├── EU       → eu.relay.proxyredirector.com
├── Asia     → asia.relay.proxyredirector.com
└── ME       → me.relay.proxyredirector.com

Engine (Central API) على VPS منفصل
PostgreSQL + Redis على نفس VPS أو managed service
```

---

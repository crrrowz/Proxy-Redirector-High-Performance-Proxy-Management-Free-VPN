# 📡 Client Modules: SOCKS5 + HTTP Proxy + gRPC Client + Network

> **ملفات Go المستهدفة:**
> - `client/internal/proxy/socks5.go` ← من `servers/socks5_server.py`
> - `client/internal/proxy/http_proxy.go` ← من `servers/http_proxy_server.py`
> - `client/internal/engine/grpc_client.go` — جديد
> - `client/internal/engine/connector.go` — جديد
> - `client/internal/usage/tracker.go` ← من `utils/traffic_logger.py`
> - `client/internal/network/clients.go` — تتبع الأجهزة المتصلة
> - `client/internal/network/discovery.go` — اكتشاف IP

---

## 1. SOCKS5 Server

```go
type Socks5Server struct {
    listener    net.Listener
    failover    FailoverProvider   // interface للحصول على البروكسي النشط
    adblock     AdBlockChecker     // interface لفحص الحجب
    authEnabled bool
    username    string
    password    string
    whitelist   []string
    clients     *ClientTracker
    activeConns int64
    bytesUp     int64
    bytesDown   int64
}

// FailoverProvider — interface يستخدمه Client للحصول على البروكسي
type FailoverProvider interface {
    CurrentProxy() *models.Proxy
}

func NewSocks5Server(fp FailoverProvider, ab AdBlockChecker) *Socks5Server
func (s *Socks5Server) Start(host string, port int) error
func (s *Socks5Server) Stop() error
func (s *Socks5Server) ActiveConnections() int
func (s *Socks5Server) ConnectedClients() []ClientInfo
```

### تسلسل SOCKS5
```
1. Client يتصل
2. Version handshake (0x05)
3. Auth negotiation (none أو username/password)
4. فحص Whitelist (192.168.x.x → skip auth)
5. CONNECT request (domain:port)
6. AdBlock check → إذا محظور: رفض + log
7. فتح اتصال عبر البروكسي النشط (عبر gRPC → Engine)
8. نسخ ثنائي الاتجاه (io.Copy) مع حساب bytes
```

---

## 2. HTTP Proxy Server

```go
type HttpProxyServer struct {
    server      *http.Server
    failover    FailoverProvider
    adblock     AdBlockChecker
    authEnabled bool
    username    string
    password    string
    whitelist   []string
    clients     *ClientTracker
    activeConns int64
    bytesUp     int64
    bytesDown   int64
}

func NewHttpProxyServer(fp FailoverProvider, ab AdBlockChecker) *HttpProxyServer
func (s *HttpProxyServer) Start(host string, port int) error
func (s *HttpProxyServer) Stop() error
```

### تسلسل HTTP Proxy
```
1. Request وارد
2. فحص Proxy-Authorization header (إذا مطلوب)
3. فحص Whitelist
4. إذا CONNECT method → HTTPS tunneling
5. إذا HTTP → forwarding
6. AdBlock check على الهدف
7. توجيه عبر البروكسي النشط
8. حساب bytes
```

---

## 3. gRPC Client

```go
type GRPCClient struct {
    conn       *grpc.ClientConn
    client     enginev1.ProxyEngineClient
    address    string
    connected  bool
    mu         sync.RWMutex
}

func NewGRPCClient(address string) *GRPCClient
func (c *GRPCClient) Connect(ctx context.Context) error
func (c *GRPCClient) Disconnect() error
func (c *GRPCClient) IsConnected() bool

// Proxy operations
func (c *GRPCClient) RequestConnect(region, protocol string) (*ConnectResponse, error)
func (c *GRPCClient) RequestDisconnect(sessionID string) error
func (c *GRPCClient) GetActiveProxy() (*ProxyInfo, error)
func (c *GRPCClient) StreamUpdates(ctx context.Context) (<-chan *ProxyUpdate, error)

// Status
func (c *GRPCClient) GetEngineStatus() (*EngineStatus, error)
func (c *GRPCClient) GetPoolSummary() (*PoolSummary, error)

// Usage
func (c *GRPCClient) ReportUsage(report *UsageReport) (*UsageResponse, error)

// Config
func (c *GRPCClient) GetConfig() (map[string]string, error)
func (c *GRPCClient) UpdateConfig(updates map[string]string) error
```

---

## 4. Connector (إعادة الاتصال التلقائي)

```go
type Connector struct {
    grpc        *GRPCClient
    currentProxy *models.Proxy
    sessionID   string
    state       ConnectionState  // disconnected, connecting, connected, reconnecting
    maxRetries  int              // 3
    retryDelay  time.Duration    // 2s
    onStateChange func(ConnectionState)
}

func NewConnector(grpcAddr string) *Connector
func (c *Connector) Connect(region, protocol string) error
func (c *Connector) Disconnect() error
func (c *Connector) State() ConnectionState
func (c *Connector) CurrentProxy() *models.Proxy
```

---

## 5. Usage Tracker

```go
type Tracker struct {
    bytesUp       int64
    bytesDown     int64
    sessionStart  time.Time
    reportTicker  *time.Ticker
    grpc          *GRPCClient
    sessionID     string
}

func NewTracker(grpc *GRPCClient) *Tracker
func (t *Tracker) Start(sessionID string)
func (t *Tracker) Stop()
func (t *Tracker) AddBytes(up, down int64)
func (t *Tracker) GetUsage() (up, down int64)
```

يرسل تقارير كل 30 ثانية عبر gRPC.

---

## 6. Client Tracker (الأجهزة المتصلة محلياً)

```go
type ClientInfo struct {
    IP       string
    Protocol string  // "SOCKS5" أو "HTTP"
    Target   string
    ConnTime time.Time
}

type ClientTracker struct {
    clients map[string]*ClientInfo
    mu      sync.RWMutex
}

func (ct *ClientTracker) Add(ip, protocol, target string)
func (ct *ClientTracker) Remove(ip string)
func (ct *ClientTracker) List() []ClientInfo
func (ct *ClientTracker) Count() int
```

---

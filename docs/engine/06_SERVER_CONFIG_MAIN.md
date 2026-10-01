# 🔌 Engine Module: gRPC Server + REST API + Config + Main

> **ملفات Go المستهدفة:**
> - `engine/internal/server/grpc_server.go`
> - `engine/internal/server/rest_api.go`
> - `engine/internal/config/config.go`
> - `engine/cmd/engine/main.go`

---

## 1. gRPC Server

ينفّذ كل methods المعرّفة في `proto/engine/v1/engine.proto`.

```go
type GRPCServer struct {
    enginev1.UnimplementedProxyEngineServer
    manager   *proxy.Manager
    failover  *failover.Handler
    adblock   *adblock.Engine
    analytics *proxy.Analytics
    config    *config.Config
    subscribers []chan *ProxyUpdate  // streaming subscribers
}

func NewGRPCServer(...) *GRPCServer
func (s *GRPCServer) Start(port int) error
func (s *GRPCServer) Stop()
```

### Streaming
- `StreamProxyUpdates` — يفتح stream ويرسل updates عند:
  - تغيّر البروكسي النشط
  - سقوط البروكسي
  - تحديث Pool
  - تحذير استهلاك

---

## 2. REST API (Admin Dashboard)

نفس endpoints من `servers/api_server.py` الحالي:

| Method | Path | الوظيفة |
|--------|------|---------|
| GET | `/api/status` | حالة Engine |
| GET | `/api/proxies` | جدول البروكسيات (top 30) |
| GET | `/api/clients` | العملاء المتصلون |
| GET | `/api/traffic` | إحصائيات الحركة |
| GET | `/api/config` | الإعدادات الحالية |
| GET | `/api/blocklist` | قواعد AdBlock |
| GET | `/api/countries` | الدول المتاحة |
| GET | `/api/analytics` | تحليلات |
| GET | `/api/analytics/top` | أفضل 20 بروكسي |
| POST | `/api/start` | تشغيل المحرك |
| POST | `/api/stop` | إيقاف المحرك |
| POST | `/api/config` | تحديث الإعدادات |
| POST | `/api/blocklist/rules` | إضافة/حذف قاعدة |
| POST | `/api/blocklist/toggle` | تشغيل/إيقاف تصنيف |
| POST | `/api/proxy/select` | اختيار بروكسي يدوياً |
| POST | `/api/proxy/add` | إضافة بروكسي يدوياً |

يستخدم `net/http` stdlib (بدون framework).
يخدم ملفات static من `static/` للـ dashboard HTML.

---

## 3. Config

نفس نظام `config.py` — ملف JSON مع defaults:

```go
type Config struct {
    // Pool
    MinAlivePool          int      `json:"MIN_ALIVE_POOL"`           // 3
    BatchSize             int      `json:"BATCH_SIZE"`               // 50
    RecheckIntervalSec    int      `json:"RECHECK_INTERVAL_SECONDS"` // 60
    
    // Check
    CheckTimeoutSec       int      `json:"CHECK_TIMEOUT_SECONDS"`    // 8
    MaxConcurrentChecks   int      `json:"MAX_CONCURRENT_CHECKS"`    // 50
    CheckURL              string   `json:"CHECK_URL"`
    AnonymityCheck        bool     `json:"ANONYMITY_CHECK"`          // true
    MaxSpeedMs            int      `json:"MAX_SPEED_MS"`             // 0
    SSLCheckEnabled       bool     `json:"SSL_CHECK_ENABLED"`        // true
    
    // Retry
    DeadRetryAfterSec     int      `json:"DEAD_RETRY_AFTER_SECONDS"` // 300
    MaxConsecFailures     int      `json:"MAX_CONSECUTIVE_FAILURES"` // 5
    BlacklistAfterFails   int      `json:"BLACKLIST_AFTER_FAILURES"` // 15
    
    // Server
    GRPCPort              int      `json:"GRPC_PORT"`                // 50051
    RESTPort              int      `json:"REST_PORT"`                // 9090
    
    // Auth
    AuthEnabled           bool     `json:"AUTH_ENABLED"`             // true
    AuthUsername           string   `json:"AUTH_USERNAME"`
    AuthPassword          string   `json:"AUTH_PASSWORD"`
    AuthWhitelist         []string `json:"AUTH_WHITELIST"`
    
    // Scoring
    ScoreAlive            float64  `json:"SCORE_ALIVE"`              // 50
    ScoreSpeedMax         float64  `json:"SCORE_SPEED_MAX"`          // 25
    ScoreRecencyMax       float64  `json:"SCORE_RECENCY_MAX"`        // 15
    ScoreFailurePenalty   float64  `json:"SCORE_FAILURE_PENALTY"`    // 5
    ScoreSuccessRateMax   float64  `json:"SCORE_SUCCESS_RATE_MAX"`   // 10
    ScoreSSLBonus         float64  `json:"SCORE_SSL_BONUS"`          // 30
    
    // Country
    CountryFilter         string   `json:"COUNTRY_FILTER"`           // "GLOBAL"
    
    // AdBlock
    AdBlockEnabled        bool     `json:"ADBLOCK_ENABLED"`          // true
    
    // Discovery
    DiscoveryBatchSize    int      `json:"DISCOVERY_BATCH_SIZE"`     // 20
    DiscoveryDelaySec     int      `json:"DISCOVERY_DELAY_SECONDS"`  // 3
    
    // Fetch
    FetchEnabled          bool     `json:"FETCH_ENABLED"`            // true
    FetchIntervalSec      int      `json:"FETCH_INTERVAL_SECONDS"`   // 120
    
    // Files
    ProxiesFile           string   `json:"PROXIES_FILE"`
    StatusFile            string   `json:"STATUS_FILE"`
    BlocklistFile         string   `json:"BLOCKLIST_FILE"`
    AnalyticsFile         string   `json:"ANALYTICS_FILE"`
    
    // Runtime
    RealIP                string   `json:"-"`
    Mode                  string   `json:"-"` // "self-hosted" or "saas"
}

func LoadConfig(path string) (*Config, error)
func (c *Config) Save() error
func (c *Config) Update(updates map[string]interface{}) map[string]interface{}
func (c *Config) GetAll() map[string]interface{}
```

---

## 4. Main (Entry Point)

```go
func main():
  1. Parse flags (--mode=self-hosted|saas, --config=path)
  2. Load config
  3. Initialize Manager, Failover, AdBlock, Analytics
  4. Detect real IP
  5. Start gRPC server
  6. Start REST API server
  7. Start background tasks:
     - maintain_pool (recheck alive, retry dead, fill pool)
     - continuous_discovery (scan unchecked proxies)
     - online_fetch (fetch new proxies from internet)
  8. Wait for shutdown signal (Ctrl+C)
  9. Graceful shutdown
```

---

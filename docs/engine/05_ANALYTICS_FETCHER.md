# 📊 Engine Module: Analytics + Fetcher

> **ملفات Go المستهدفة:**
> - `engine/internal/proxy/analytics.go` ← من `core/proxy_analytics.py`
> - `engine/internal/proxy/fetcher.go` ← من `core/proxy_fetcher.py`

---

## Analytics — تتبع الأداء التاريخي

### الواجهة
```go
type Analytics struct {
    data     map[string]*ProxyProfile  // key = proxy ID
    mu       sync.RWMutex
    filePath string
}

type ProxyProfile struct {
    ID              string
    TotalChecks     int
    TotalSuccesses  int
    AvgSpeedMs      float64
    MinSpeedMs      float64
    MaxSpeedMs      float64
    SpeedHistory    []float64  // آخر 100 قياس
    UptimePct       float64
    ReliabilityScore float64  // 0-100
    Tags            []string  // "fast", "stable", "slow", "unreliable", "recommended"
    Country         string
    LastChecked     time.Time
}

func NewAnalytics(filePath string) *Analytics
func (a *Analytics) RecordCheck(id string, alive bool, speedMs float64, country string)
func (a *Analytics) GetSummary() AnalyticsSummary
func (a *Analytics) GetTopProxies(limit int) []*ProxyProfile
func (a *Analytics) GetCountryStats() map[string]CountryStats
func (a *Analytics) Load() error
func (a *Analytics) Save() error
```

### Reliability Score
```
reliability = stability(40%) + speed(30%) + consistency(20%) + recency(10%)
stability   = uptime_pct
speed       = 100 - (avg_speed_ms / 5)
consistency = based on coefficient of variation
recency     = 100 - (hours_since_check × 4)
```

### Auto-Tags
| الشرط | الوسم |
|-------|-------|
| avg_speed < 200ms | `fast` |
| uptime > 90% | `stable` |
| avg_speed > 1000ms | `slow` |
| uptime < 50% | `unreliable` |
| checks < 5 | `new` |
| reliability > 80 | `recommended` |

---

## Fetcher — جلب بروكسيات من الإنترنت

### الواجهة
```go
type Fetcher struct {
    knownSet map[string]bool  // "ip:port" → true
    stats    FetchStats
    mu       sync.Mutex
}

type FetchStats struct {
    TotalFetched  int
    TotalAdded    int
    TotalSources  int
    LastFetchTime time.Time
}

func NewFetcher() *Fetcher
func (f *Fetcher) FetchAll(ctx context.Context) ([]*models.Proxy, error)
func (f *Fetcher) AddKnown(ip string, port int)
func (f *Fetcher) GetStats() FetchStats
```

### المصادر
يجلب من APIs عامة مثل:
- `https://api.proxyscrape.com/v2/`
- `https://www.proxy-list.download/api/v1/get`
- أي مصادر أخرى مجانية

---

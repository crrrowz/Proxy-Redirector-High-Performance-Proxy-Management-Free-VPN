# 📦 Engine Module: Proxy Manager

> **ملف Go المستهدف:** `engine/internal/proxy/manager.go`
> **مرجع Python:** `core/proxy_manager.py` (480 سطر)
> **الأولوية:** 🔴 حرجة

---

## الوظيفة

إدارة مجموعة البروكسيات (Pool): تحميل، تسجيل نقاط، ترتيب، فلترة، والتحكم بدورة حياة كل بروكسي.

---

## الواجهة المطلوبة (API)

```go
type Manager struct {
    proxies    []*models.Proxy
    status     map[string]*models.ProxyStatus  // key = proxy.ID
    byID       map[string]*models.Proxy
    mu         sync.RWMutex
    config     *config.Config
    dataFile   string
    statusFile string
    rotator    *Rotator  // محرك التبديل التلقائي
}

// NewManager ينشئ manager جديد
func NewManager(cfg *config.Config) *Manager

// Rotator يرجع محرك التبديل التلقائي
func (m *Manager) Rotator() *Rotator

// LoadProxies يحمّل البروكسيات من ملف JSON
func (m *Manager) LoadProxies() ([]*models.Proxy, error)

// UpdateStatus يحدّث حالة بروكسيات بعد الفحص
func (m *Manager) UpdateStatus(results []*models.CheckResult)

// GetAliveProxies يرجع البروكسيات الحية
func (m *Manager) GetAliveProxies() []*models.Proxy

// GetDeadForRetry يرجع الميتة المؤهلة لإعادة المحاولة
func (m *Manager) GetDeadForRetry() []*models.Proxy

// GetUnchecked يرجع بروكسيات لم تُفحص بعد
func (m *Manager) GetUnchecked(limit int) []*models.Proxy

// CalculateScore يحسب نقاط بروكسي واحد
func (m *Manager) CalculateScore(p *models.Proxy) float64

// GetPoolSummary يرجع ملخص المجموعة
func (m *Manager) GetPoolSummary() *models.PoolSummary

// GetDashboardData يرجع أفضل 30 بروكسي مرتبة
func (m *Manager) GetDashboardData() []*models.DashboardItem

// GetProxyStatus يرجع حالة بروكسي محدد
func (m *Manager) GetProxyStatus(id string) *models.ProxyStatus

// AddCustomProxy يضيف بروكسي يدوياً
func (m *Manager) AddCustomProxy(ip string, port int, ptype string, user, pass string) *models.Proxy

// GetAvailableCountries يرجع الدول المتاحة مع عدد البروكسيات
func (m *Manager) GetAvailableCountries() []CountryInfo

// SaveSortedDataFile يحفظ البيانات مرتبة حسب الأداء
func (m *Manager) SaveSortedDataFile()
```

---

## خوارزمية Scoring

من `proxy_manager.py`:

```
Score = SCORE_ALIVE (50)                                    # حي أم لا
      + speed_score (0-25)                                  # سرعة الاستجابة
      + recency_score (0-15)                                # حداثة آخر فحص ناجح
      + success_rate_score (0-10)                            # نسبة النجاح التاريخية
      + ssl_bonus (30)                                       # إذا SSL verified
      - failure_penalty (5 × consecutive_failures)           # عقوبة الفشل

speed_score = SCORE_SPEED_MAX × (1 - response_time / SPEED_THRESHOLD)
recency_score = SCORE_RECENCY_MAX × max(0, 1 - hours_since_check / 1)
success_rate_score = SCORE_SUCCESS_RATE_MAX × (successes / checks)
```

---

## Second Chance System

```
1. بروكسي يفشل → consecutive_failures++
2. إذا consecutive_failures >= MAX_CONSECUTIVE_FAILURES → يُعتبر ميت
3. بعد DEAD_RETRY_AFTER_SECONDS → يُعاد للقائمة المؤهلة لإعادة المحاولة
4. إذا نجح → يرجع حي (consecutive_failures = 0)
5. إذا فشل مرة أخرى وتجاوز BLACKLIST_AFTER_FAILURES → blacklisted نهائياً
```

---

## تنسيقات ملف البيانات

```json
// Format 1: Array
[{"ip": "1.2.3.4", "port": 8080, "type": "socks5"}]

// Format 2: Object with key
{"proxies": [{"ip": "1.2.3.4", "port": 8080, "type": "socks5"}]}
```

---

# 🛡️ Engine Module: AdBlock Engine

> **ملف Go المستهدف:** `engine/internal/adblock/engine.go`
> **مرجع Python:** `core/adblock_manager.py` (420 سطر)
> **الأولوية:** 🟡 مهمة

---

## الوظيفة

حجب الإعلانات والمواقع الضارة على مستوى الاسم (domain-level blocking).
يفحص كل طلب قبل تمريره عبر البروكسي.

---

## الواجهة المطلوبة

```go
type Engine struct {
    enabled           bool
    exactDomains      map[string]string   // domain → category
    wildcardRules     []WildcardRule
    whitelist         map[string]bool
    categoriesEnabled map[string]bool     // "ads", "tracking", "malware", "custom"
    stats             BlockStats
    mu                sync.RWMutex
    filePath          string
}

type WildcardRule struct {
    Pattern  string
    Category string
}

type BlockStats struct {
    TotalBlocked   int64
    BlockedByDomain map[string]int64   // top blocked domains
    BlockedByCategory map[string]int64
}

func NewEngine(filePath string) *Engine

// ShouldBlock يفحص هل يجب حجب هذا الدومين (3 مراحل)
func (e *Engine) ShouldBlock(domain string) (blocked bool, category string)

// AddRule يضيف قاعدة حجب
func (e *Engine) AddRule(domain, category string) bool

// RemoveRule يحذف قاعدة
func (e *Engine) RemoveRule(domain string) bool

// AddWhitelist يضيف استثناء
func (e *Engine) AddWhitelist(domain string) bool

// RemoveWhitelist يحذف استثناء
func (e *Engine) RemoveWhitelist(domain string) bool

// ToggleCategory تشغيل/إيقاف تصنيف
func (e *Engine) ToggleCategory(category string, enabled bool)

// ToggleEnabled تشغيل/إيقاف المحرك بالكامل
func (e *Engine) ToggleEnabled(enabled bool)

// GetStats إحصائيات الحجب
func (e *Engine) GetStats() BlockStats

// GetRules كل القواعد
func (e *Engine) GetRules() map[string]string

// GetWhitelist القائمة البيضاء
func (e *Engine) GetWhitelist() []string

// GetCategories حالة كل تصنيف
func (e *Engine) GetCategories() map[string]bool

// Load تحميل من ملف JSON
func (e *Engine) Load() error

// Save حفظ في ملف JSON
func (e *Engine) Save() error
```

---

## منطق الفحص (3 مراحل)

```
ShouldBlock("ads.tracker.example.com"):
  1. Whitelist Check:
     - هل "ads.tracker.example.com" في القائمة البيضاء? → مسموح
  
  2. Exact Match (O(1)):
     - هل "ads.tracker.example.com" في exactDomains? → محظور
     - هل "tracker.example.com" في exactDomains? → محظور (parent)
     - هل "example.com" في exactDomains? → محظور (parent)
  
  3. Wildcard Match:
     - هل يطابق أي نمط مثل "*ads.*" أو "*tracker.*"? → محظور
  
  4. لا شيء طابق → مسموح
```

---

## القواعد الافتراضية (50+ قاعدة)

يشحن مع قائمة مدمجة تشمل:
- **ads**: doubleclick.net, googlesyndication.com, adnxs.com, taboola.com...
- **tracking**: facebook.net, hotjar.com, clarity.ms, google-analytics.com...
- **malware**: malwaredomainlist.com...

---

## ملف blocklist.json

```json
{
  "enabled": true,
  "categories_enabled": {"ads": true, "tracking": true, "malware": true, "custom": true},
  "exact_domains": {"doubleclick.net": "ads", "facebook.net": "tracking"},
  "wildcard_rules": [{"pattern": "*ads.*", "category": "ads"}],
  "whitelist": ["safe-site.com"]
}
```

---

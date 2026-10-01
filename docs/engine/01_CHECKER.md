# 🔍 Engine Module: Proxy Checker

> **ملف Go المستهدف:** `engine/internal/proxy/checker.go`
> **مرجع Python:** `core/proxy_checker.py` (356 سطر)
> **الأولوية:** 🔴 حرجة — أول module يُبنى

---

## الوظيفة

فحص بروكسي واحد أو مجموعة بروكسيات بالتوازي لتحديد:
- هل البروكسي حي (alive)?
- سرعة الاستجابة (response_time_ms)
- هل يدعم SSL?
- هل يسرّب IP الحقيقي (anonymity check)?

---

## الواجهة المطلوبة (API)

```go
package proxy

// CheckSingle يفحص بروكسي واحد
func CheckSingle(ctx context.Context, p *models.Proxy, cfg *CheckConfig) *models.CheckResult

// CheckBatch يفحص مجموعة بالتوازي مع semaphore
func CheckBatch(ctx context.Context, proxies []*models.Proxy, cfg *CheckConfig) []*models.CheckResult

// FindAlive يفحص بالدفعات حتى يجد العدد المطلوب
func FindAlive(ctx context.Context, proxies []*models.Proxy, needed int, cfg *CheckConfig) []*models.CheckResult

// RecheckAlive يعيد فحص البروكسيات العاملة
func RecheckAlive(ctx context.Context, proxies []*models.Proxy, cfg *CheckConfig) []*models.CheckResult

// DetectRealIP يكشف IP الحقيقي للمستخدم
func DetectRealIP(ctx context.Context) (string, error)
```

### CheckConfig
```go
type CheckConfig struct {
    TimeoutSeconds     int      // افتراضي: 8
    MaxConcurrent      int      // افتراضي: 50
    CheckURL           string   // افتراضي: "http://httpbin.org/ip"
    HTTPSCheckURL      string   // افتراضي: "https://httpbin.org/ip"
    AnonymityCheck     bool     // افتراضي: true
    SSLCheckEnabled    bool     // افتراضي: true
    MaxSpeedMs         int      // 0 = no limit
    RealIP             string   // IP الحقيقي (لفحص التسريب)
}
```

---

## منطق الفحص (لكل بروكسي)

```
1. إنشاء dialer حسب النوع:
   - socks5 → golang.org/x/net/proxy.SOCKS5()
   - socks4 → custom dialer
   - http/https → http.Transport with Proxy

2. HTTP Check:
   - اتصال عبر الـ dialer بـ CheckURL
   - قياس response_time_ms
   - التحقق من status 200
   - استخراج IP من الاستجابة

3. Anonymity Check (إذا مفعّل):
   - مقارنة IP الاستجابة مع RealIP
   - إذا تطابقا → البروكسي شفاف (يسرّب) → رفض

4. Speed Check (إذا MaxSpeedMs > 0):
   - إذا response_time_ms > MaxSpeedMs → رفض

5. SSL Check (إذا مفعّل):
   - اتصال بـ HTTPSCheckURL عبر نفس الـ dialer
   - إذا نجح → ssl_verified = true
```

---

## نقاط مهمة من Python

من `proxy_checker.py`:
- `check_single_proxy()` — يفحص HTTP ثم SSL إذا نجح
- `check_batch()` — `asyncio.Semaphore(MAX_CONCURRENT_CHECKS)` → في Go: `semaphore = make(chan struct{}, max)`
- `find_alive_proxies()` — يتوقف عند إيجاد `needed` عدد
- HTTP type يُعامل كـ HTTPS داخلياً
- الـ timeout يشمل الاتصال + القراءة

---

## الأداء المتوقع (Go vs Python)

| المقياس | Python (asyncio) | Go (goroutines) |
|---------|-----------------|-----------------|
| 50 بروكسي بالتوازي | ~8-10 ثواني | ~2-3 ثواني |
| 1000 بروكسي (batches of 50) | ~3-4 دقائق | ~30-60 ثانية |
| Memory per connection | ~50KB | ~8KB (goroutine) |

---

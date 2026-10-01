# 🔄 Engine Module: Failover Handler

> **ملف Go المستهدف:** `engine/internal/failover/handler.go`
> **مرجع Python:** `core/failover_handler.py` (143 سطر)
> **الأولوية:** 🔴 حرجة

---

## الوظيفة

اختيار أفضل بروكسي نشط وتبديله تلقائياً عند فشله.

---

## الواجهة المطلوبة

```go
type Handler struct {
    manager       *proxy.Manager
    currentProxy  *models.Proxy
    switchCount   int
    manualLocked  bool  // إذا true → لا يبدّل تلقائياً
    mu            sync.RWMutex
    subscribers   []chan *models.Proxy  // إشعار المشتركين عند التبديل
}

func NewHandler(manager *proxy.Manager) *Handler

// Initialize يختار أفضل بروكسي أولي
func (h *Handler) Initialize() error

// CurrentProxy يرجع البروكسي النشط
func (h *Handler) CurrentProxy() *models.Proxy

// RefreshBest يعيد اختيار الأفضل (يُستدعى بعد كل جولة فحص)
func (h *Handler) RefreshBest() error

// SuggestSwitch يقترح تبديل (عند فشل البروكسي الحالي)
func (h *Handler) SuggestSwitch() (*models.Proxy, error)

// ForceSelect يختار بروكسي محدد يدوياً (يقفل التبديل التلقائي)
func (h *Handler) ForceSelect(proxy *models.Proxy) error

// UnlockAuto يفتح التبديل التلقائي
func (h *Handler) UnlockAuto()

// Subscribe يسجّل channel لاستقبال تحديثات البروكسي
func (h *Handler) Subscribe() <-chan *models.Proxy

// SwitchCount يرجع عدد مرات التبديل
func (h *Handler) SwitchCount() int

// IsManualLocked يرجع هل التبديل مقفل يدوياً
func (h *Handler) IsManualLocked() bool
```

---

## منطق التبديل

ملاحظة: يتم تجاهل الـ Failover اليدوي بالكامل في حال كان وضع `RotationEnabled` مفعلًا عبر واجهة المستخدم (Surge Mode). الـ `Rotator` يتولى مهمة تغيير البروكسيات وإرسال الإشعارات بناءً على الوقت (Interval).

```
RefreshBest():
  1. الحصول على كل البروكسيات الحية من Manager
  2. ترتيبها حسب Score (تنازلي)
  3. إذا manualLocked → لا تبدّل
  4. إذا الأفضل مختلف عن الحالي → تبديل + إشعار subscribers
  5. switchCount++

SuggestSwitch():
  1. البروكسي الحالي سقط
  2. إذا RotationEnabled → إجبار Rotator على تخطي البروكسي والانتقال للتالي.
  3. ابحث عن أفضل بديل (استثنِ الحالي)
  4. إذا وُجد → بدّل
  5. إذا لم يُوجد → error "no alive proxy"
```

---

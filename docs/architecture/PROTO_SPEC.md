# 📋 Proto Spec — شرح كل gRPC Message و Service

> **الملف:** `proto/engine/v1/engine.proto`

---

## Service: ProxyEngine

الخدمة الوحيدة بين Engine.exe ↔ Client.exe. تحتوي 18 method:

---

### Connection Lifecycle

| Method | Input → Output | الوصف |
|--------|----------------|-------|
| `Connect` | `ConnectRequest → ConnectResponse` | يطلب اتصال بمنطقة محددة. Engine يختار أفضل بروكسي ويرجعه. في SaaS mode يرجع relay info أيضاً |
| `Disconnect` | `DisconnectRequest → DisconnectResponse` | يقطع الاتصال ويحفظ الاستهلاك |

**ConnectRequest:**
- `region` — كود دولة ISO (مثل "US") أو فارغ لـ auto-select
- `protocol` — "socks5" أو "http"، افتراضي socks5

**ConnectResponse:**
- `success` — هل نجح الاتصال
- `session_id` — UUID للجلسة (لتتبع الاستهلاك)
- `active_proxy` — بيانات البروكسي المختار (ProxyInfo)
- `relay_host/port/session_token/expires_at` — فقط في SaaS mode
- `error` — رسالة خطأ إذا فشل

---

### Proxy Info

| Method | الوصف |
|--------|-------|
| `GetActiveProxy` | يرجع البروكسي النشط الحالي |
| `StreamProxyUpdates` | Server-side streaming — يرسل تحديثات مستمرة عند: تغيّر البروكسي، سقوطه، تحديث Pool، تحذير استهلاك |
| `GetProxies` | يرجع قائمة بروكسيات (مع limit وفلتر دولة) |

**ProxyInfo — بنية البروكسي الكاملة:**
```
id, ip, port, protocol (enum), country, city, status (enum),
speed_ms, score, ssl_verified, consecutive_failures, is_active,
username, password, last_checked (timestamp)
```

**ProxyUpdate — تحديث مباشر:**
```
type (enum: PROXY_CHANGED, PROXY_DOWN, POOL_UPDATED, BANDWIDTH_WARNING, ENGINE_STOPPED)
proxy (ProxyInfo), pool (PoolSummary), message, timestamp
```

---

### Status & Pool

| Method | الوصف |
|--------|-------|
| `GetEngineStatus` | حالة المحرك الكاملة: running, mode, ports, active proxy, pool summary, discovery status |
| `GetPoolSummary` | ملخص المجموعة فقط: total, alive, dead, retryable, blacklisted, unchecked |

**EngineStatus — الحالة الشاملة:**
```
running, starting, mode ("self-hosted"/"saas"),
socks5_port, http_port, socks5_ok, http_ok,
auth_enabled, local_ips[], active_proxy, pool, discovery
```

**DiscoveryStatus:**
```
enabled, paused, round (رقم الجولة الحالية),
checked (عدد المفحوصين في هذه الجولة),
alive_found, total_unchecked
```

---

### Usage

| Method | الوصف |
|--------|-------|
| `ReportUsage` | Client يرسل تقرير استهلاك كل 30 ثانية |

**UsageReport → UsageResponse:**
- Input: `session_id, bytes_up, bytes_down, interval_seconds`
- Output: `status ("ok"/"warning"/"throttle"/"disconnect"), bandwidth_remaining_gb, action`

---

### AdBlock

| Method | الوصف |
|--------|-------|
| `GetBlockStats` | إحصائيات الحجب: enabled, total_blocked, rules_count, categories |
| `ToggleAdBlock` | تشغيل/إيقاف تصنيف أو المحرك بالكامل |
| `CheckDomain` | هل هذا الدومين محظور؟ يرجع: blocked, category, matched_rule |

---

### Auth

| Method | الوصف |
|--------|-------|
| `Authenticate` | تسجيل دخول: email + password + device fingerprint → JWT tokens |
| `RefreshToken` | تجديد JWT token |

**AuthResponse:**
```
success, access_token, refresh_token, expires_in,
user (id, email, role, plan, bandwidth_remaining, max_devices),
error
```

---

### Config

| Method | الوصف |
|--------|-------|
| `GetConfig` | كل الإعدادات كـ `map<string, string>` |
| `UpdateConfig` | تحديث إعدادات محددة |

---

### Analytics

| Method | الوصف |
|--------|-------|
| `GetAnalyticsSummary` | ملخص: total_tracked, avg_speed, avg_uptime, best/worst proxy |
| `GetTopProxies` | أفضل N بروكسي حسب reliability score |

---

### Rotation (Surge Mode)

| Method | الوصف |
|--------|-------|
| `GetRotationStatus` | يرجع حالة محرك التبديل التلقائي (enabled, pool_size, active_proxy, filters...) |
| `GetRotationPool` | يرجع قائمة البروكسيات المؤهلة للتبديل حالياً (بحسب الفلاتر) |
| `EnableRotation` | يُفعّل التبديل التلقائي مع ضبط الفلاتر والسرعة القصوى والوقت الفاصل |
| `DisableRotation` | يُعطل التبديل التلقائي ويُرجع التحكم لـ Failover اليدوي |

---

## Enums

### ProxyProtocol
```
UNSPECIFIED(0), SOCKS5(1), SOCKS4(2), HTTP(3), HTTPS(4)
```

### ProxyStatus
```
UNSPECIFIED(0), ALIVE(1), DEAD(2), CHECKING(3), BLACKLISTED(4), UNCHECKED(5)
```

### UpdateType
```
UNSPECIFIED(0), PROXY_CHANGED(1), PROXY_DOWN(2), POOL_UPDATED(3), 
BANDWIDTH_WARNING(4), ENGINE_STOPPED(5)
```

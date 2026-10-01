# ⚠️ Error Handling & Logging Strategy

---

## 1. Error Handling

### مبدأ عام
- **Engine** يُرجع أخطاء مفصّلة (للمطور)
- **Client** يحوّلها لرسائل واضحة (للمستخدم)
- **gRPC** يستخدم `status.Errorf()` مع error codes

### gRPC Error Codes

| الكود | متى يُستخدم | رسالة المستخدم |
|-------|-------------|----------------|
| `codes.OK` | نجاح | — |
| `codes.Unavailable` | Engine غير متصل | "تعذر الاتصال بالمحرك" |
| `codes.NotFound` | لا يوجد بروكسي حي | "لا يوجد بروكسي متاح — أعد المحاولة لاحقاً" |
| `codes.PermissionDenied` | JWT غير صالح أو منتهي | "يرجى تسجيل الدخول مجدداً" |
| `codes.ResourceExhausted` | تجاوز حد الباندويث | "انتهى الباندويث — ترقية الباقة" |
| `codes.FailedPrecondition` | حد الأجهزة وصل | "تجاوزت حد الأجهزة — احذف جهازاً" |
| `codes.InvalidArgument` | منطقة غير صالحة | "المنطقة المحددة غير متاحة" |
| `codes.Internal` | خطأ داخلي غير متوقع | "حدث خطأ — حاول مرة أخرى" |
| `codes.Unauthenticated` | بدون token | "يرجى تسجيل الدخول" |
| `codes.DeadlineExceeded` | timeout | "انتهت المهلة — تحقق من اتصالك" |

### كيف يعالج Engine الأخطاء

```go
// engine/internal/server/grpc_server.go
func (s *GRPCServer) Connect(ctx context.Context, req *pb.ConnectRequest) (*pb.ConnectResponse, error) {
    proxy, err := s.failover.CurrentProxy()
    if err != nil {
        // log التفاصيل الداخلية
        log.Error("failover.CurrentProxy failed", "error", err)
        // أرجع gRPC error بدون تفاصيل حساسة
        return nil, status.Errorf(codes.NotFound, "no alive proxy available")
    }
    // ...
}
```

### كيف يعالج Client الأخطاء

```go
// client/internal/engine/connector.go
func (c *Connector) Connect(region, protocol string) error {
    resp, err := c.grpc.RequestConnect(region, protocol)
    if err != nil {
        st, ok := status.FromError(err)
        if !ok {
            return fmt.Errorf("connection error: %w", err)
        }
        switch st.Code() {
        case codes.Unavailable:
            c.setState(StateDisconnected)
            return &UserError{Message: "تعذر الاتصال بالمحرك", Recoverable: true}
        case codes.NotFound:
            return &UserError{Message: "لا يوجد بروكسي متاح", Recoverable: true}
        case codes.PermissionDenied:
            c.auth.ClearTokens()
            return &UserError{Message: "يرجى تسجيل الدخول مجدداً", Recoverable: false}
        case codes.ResourceExhausted:
            return &UserError{Message: "انتهى الباندويث", Action: "upgrade"}
        default:
            return &UserError{Message: "حدث خطأ — حاول مرة أخرى", Recoverable: true}
        }
    }
    return nil
}

// UserError خطأ يُعرض للمستخدم في GUI
type UserError struct {
    Message     string
    Recoverable bool    // هل يمكن إعادة المحاولة
    Action      string  // "upgrade", "login", "retry", ""
}
```

### REST API Error Format

```json
{
  "error": {
    "code": "NO_ALIVE_PROXY",
    "message": "No alive proxy available",
    "details": "Pool has 0 alive proxies out of 150 total"
  }
}
```

### REST Error Codes

| HTTP | الكود | الوصف |
|------|-------|-------|
| 400 | `INVALID_INPUT` | مدخل غير صالح |
| 401 | `UNAUTHORIZED` | بدون auth أو token منتهي |
| 403 | `FORBIDDEN` | ليس لديك صلاحية |
| 404 | `NOT_FOUND` | المورد غير موجود |
| 409 | `CONFLICT` | تعارض (بريد مسجّل مسبقاً) |
| 429 | `RATE_LIMITED` | تجاوز حد الطلبات |
| 500 | `INTERNAL_ERROR` | خطأ داخلي |
| 503 | `SERVICE_UNAVAILABLE` | الخدمة غير متاحة |

### Retry Strategy

```go
// client/internal/engine/connector.go
const (
    MaxRetries    = 3
    RetryDelay    = 2 * time.Second
    MaxRetryDelay = 30 * time.Second
)

func (c *Connector) connectWithRetry(region, protocol string) error {
    var lastErr error
    delay := RetryDelay
    
    for attempt := 1; attempt <= MaxRetries; attempt++ {
        err := c.connectOnce(region, protocol)
        if err == nil {
            return nil
        }
        lastErr = err
        
        // لا تعيد المحاولة إذا الخطأ غير قابل للاسترجاع
        if uerr, ok := err.(*UserError); ok && !uerr.Recoverable {
            return err
        }
        
        log.Warn("connect attempt failed", "attempt", attempt, "error", err)
        time.Sleep(delay)
        delay = min(delay*2, MaxRetryDelay) // exponential backoff
    }
    return fmt.Errorf("all %d attempts failed: %w", MaxRetries, lastErr)
}
```

---

## 2. Logging

### المكتبة: `log/slog` (Go stdlib)

لماذا slog وليس مكتبة خارجية:
- مدمج في Go 1.21+ — لا dependency إضافي
- Structured logging (JSON + text)
- مستويات: Debug, Info, Warn, Error
- Context-aware

### الإعداد

```go
// shared/utils/logger.go
package utils

import (
    "log/slog"
    "os"
    "io"
)

func SetupLogger(level string, logFile string, jsonFormat bool) *slog.Logger {
    var lvl slog.Level
    switch level {
    case "debug": lvl = slog.LevelDebug
    case "info":  lvl = slog.LevelInfo
    case "warn":  lvl = slog.LevelWarn
    case "error": lvl = slog.LevelError
    default:      lvl = slog.LevelInfo
    }
    
    var writer io.Writer = os.Stderr
    if logFile != "" {
        f, err := os.OpenFile(logFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
        if err == nil {
            writer = io.MultiWriter(os.Stderr, f) // كلاهما: console + file
        }
    }
    
    opts := &slog.HandlerOptions{Level: lvl}
    var handler slog.Handler
    if jsonFormat {
        handler = slog.NewJSONHandler(writer, opts)
    } else {
        handler = slog.NewTextHandler(writer, opts)
    }
    
    return slog.New(handler)
}
```

### استخدام

```go
// Engine
log := utils.SetupLogger("info", "engine.log", false)
log.Info("engine started", "mode", cfg.Mode, "grpc_port", cfg.GRPCPort)
log.Warn("proxy failed", "proxy_id", id, "error", err)
log.Error("grpc server crashed", "error", err)

// Client
log.Info("connected", "region", "US", "proxy", proxy.Address())
log.Debug("bytes transferred", "up", bytesUp, "down", bytesDown)
```

### صيغة الخرج (Text)
```
time=2026-09-02T10:00:00Z level=INFO msg="engine started" mode=self-hosted grpc_port=50051
time=2026-09-02T10:00:05Z level=WARN msg="proxy failed" proxy_id=1.2.3.4_8080 error="timeout"
```

### صيغة الخرج (JSON — للإنتاج)
```json
{"time":"2026-09-02T10:00:00Z","level":"INFO","msg":"engine started","mode":"self-hosted","grpc_port":50051}
```

### مكان حفظ الـ Logs

| البرنامج | الملف | الموقع |
|----------|-------|--------|
| Engine | `engine.log` | بجانب `engine.exe` أو `%APPDATA%/ProxyRedirector/logs/` |
| Client | `client.log` | `%APPDATA%/ProxyRedirector/logs/` |

### Log Rotation
- حد أقصى: 10MB لكل ملف
- يحتفظ بآخر 5 ملفات
- يستخدم `lumberjack` package أو تنفيذ بسيط

### ما يُسجّل وما لا يُسجّل

✅ يُسجّل:
- بدء/إيقاف الخدمات
- اتصال/قطع البروكسي
- فشل الفحص (مع السبب)
- تغيّر البروكسي النشط
- تسجيل دخول/خروج
- أخطاء gRPC/REST
- تحذيرات الاستهلاك

❌ لا يُسجّل أبداً:
- كلمات المرور
- JWT tokens
- بيانات المستخدمين الكاملة
- محتوى الحركة (traffic)
- عناوين المواقع المزارة

# 🏗️ المعمارية العامة — Proxy Redirector v3

---

## البرنامجان

### Engine.exe — المحرك الخلفي
| الجانب | التفاصيل |
|--------|----------|
| **اللغة** | Go 1.26+ |
| **الغرض** | كل العمليات المعقدة: فحص، تحليل، scoring، failover، adblock |
| **واجهة خارجية** | gRPC server (للـ Client) + REST API (للـ Admin Dashboard) |
| **البيانات** | SQLite (self-hosted) أو PostgreSQL (SaaS) |
| **التشغيل** | كخدمة خلفية (no GUI) — يمكن تشغيله كـ Windows Service |
| **الملف** | `engine/cmd/engine/main.go` |

### Client.exe — بث الاتصال
| الجانب | التفاصيل |
|--------|----------|
| **اللغة** | Go 1.26+ (Backend) + React/TypeScript (Frontend) |
| **Framework** | Wails v2 |
| **الغرض** | بث الاتصال للأجهزة + واجهة المستخدم |
| **واجهة خارجية** | SOCKS5 server + HTTP Proxy server (للأجهزة المحلية) |
| **الاتصال بالمحرك** | gRPC client يتصل بـ Engine.exe |
| **الملف** | `client/main.go` |

---

## مسار الاتصال

```
Engine.exe                          Client.exe                     الأجهزة
┌─────────────────────┐            ┌──────────────────────┐       ┌──────┐
│                     │   gRPC     │                      │ SOCKS5│      │
│  proxy_checker ──►  │◄──────────►│  grpc_client ──────► │◄──────│ 📱   │
│  proxy_manager      │  (TLS)    │  socks5_server       │       │      │
│  failover_handler   │            │  http_proxy_server   │ HTTP  │ 🖥️   │
│  adblock_engine     │  Stream   │  usage_tracker       │◄──────│      │
│  analytics_engine   │──────────►│  network_discovery   │       │ 📺   │
│  proxy_fetcher      │ (updates) │  GUI (Wails/React)   │       └──────┘
│                     │            │                      │
│  gRPC Server :50051 │            │  SOCKS5 :1080        │
│  REST API    :9090  │            │  HTTP   :8080        │
└─────────────────────┘            └──────────────────────┘
```

---

## gRPC vs REST — متى يُستخدم كل واحد

| البروتوكول | الاستخدام | السبب |
|------------|-----------|-------|
| **gRPC** | Engine ↔ Client | سرعة + streaming + type-safe |
| **REST** | Engine ↔ Admin Dashboard (browser) | المتصفح لا يدعم gRPC مباشرة |
| **REST** | Engine ↔ SaaS Central API | توافق مع Stripe webhooks وغيرها |

---

## Go Modules Structure

```
go.work
├── engine/     (github.com/crrrowz/proxy-redirector-v3/engine)
├── client/     (github.com/crrrowz/proxy-redirector-v3/client)
└── shared/     (github.com/crrrowz/proxy-redirector-v3/shared)
```

- **shared/** — أنواع البيانات المشتركة (`Proxy`, `ProxyStatus`, `CheckResult`)
- **engine/** — المحرك (يعتمد على shared)
- **client/** — العميل (يعتمد على shared)
- `go.work` يربط الثلاثة للتطوير المحلي

---

## Proto Buffer

- **ملف واحد**: `proto/engine/v1/engine.proto`
- يُولّد Go stubs في `engine/` و `client/` عبر `protoc`
- الـ generated code يُخزّن في `engine/internal/server/pb/` و `client/internal/engine/pb/`

---

## المنافذ الافتراضية

| المنفذ | الخدمة | المسؤول |
|--------|--------|---------|
| `50051` | gRPC (Engine→Client) | Engine.exe |
| `9090` | REST API (Admin) | Engine.exe |
| `1080` | SOCKS5 (للأجهزة) | Client.exe |
| `8080` | HTTP Proxy (للأجهزة) | Client.exe |

---

## تسلسل التشغيل

### Self-Hosted Mode
```
1. المستخدم يشغّل Engine.exe
   → يحمّل data/data.json
   → يبدأ فحص البروكسيات
   → يشغّل gRPC server على :50051
   → يشغّل REST API على :9090

2. المستخدم يشغّل Client.exe
   → يتصل بـ Engine عبر gRPC (localhost:50051)
   → يستقبل البروكسي النشط
   → يشغّل SOCKS5 على :1080
   → يشغّل HTTP Proxy على :8080
   → يفتح GUI
   → يبث الاتصال لكل الأجهزة على الشبكة
```

### SaaS Mode
```
1. Engine.exe يعمل على VPS (السيرفر)
   → يتصل بـ PostgreSQL + Redis
   → يدير Relay Servers
   → gRPC server على :50051 (public, TLS)

2. Client.exe عند المستخدم النهائي
   → Login (JWT)
   → يتصل بـ Engine عبر gRPC over TLS
   → يستقبل Relay info
   → يفتح TLS tunnel إلى Relay
   → يبث الاتصال محلياً
```

---

## التبعيات الرئيسية (Go Packages)

### Engine
| Package | الغرض |
|---------|-------|
| `google.golang.org/grpc` | gRPC server |
| `google.golang.org/protobuf` | Protocol Buffers |
| `golang.org/x/net/proxy` | SOCKS5 dialer |
| `net/http` | HTTP client + REST API server |
| `crypto/tls` | TLS connections |
| `encoding/json` | JSON parsing |
| `database/sql` + `modernc.org/sqlite` | SQLite (self-hosted) |
| `sync` | Concurrent map + mutex |

### Client
| Package | الغرض |
|---------|-------|
| `google.golang.org/grpc` | gRPC client |
| `github.com/wailsapp/wails/v2` | Desktop GUI |
| `net` | TCP listener (SOCKS5/HTTP) |
| `crypto/tls` | TLS tunnel |

---

## مرجعية الكود الحالي (Python → Go)

| Python File | Go Target (Engine) | الوظيفة |
|-------------|--------------------|---------| 
| `core/proxy_checker.py` | `engine/internal/proxy/checker.go` | فحص البروكسيات |
| `core/proxy_manager.py` | `engine/internal/proxy/manager.go` | إدارة Pool + Scoring |
| `core/failover_handler.py` | `engine/internal/failover/handler.go` | تبديل تلقائي |
| `core/adblock_manager.py` | `engine/internal/adblock/engine.go` | حجب الإعلانات |
| `core/proxy_analytics.py` | `engine/internal/proxy/analytics.go` | تحليلات |
| `core/proxy_fetcher.py` | `engine/internal/proxy/fetcher.go` | جلب من الإنترنت |
| `config.py` | `engine/internal/config/config.go` | الإعدادات |
| `servers/api_server.py` | `engine/internal/server/rest_api.go` | REST API |
| `servers/socks5_server.py` | `client/internal/proxy/socks5.go` | SOCKS5 |
| `servers/http_proxy_server.py` | `client/internal/proxy/http_proxy.go` | HTTP Proxy |
| `utils/traffic_logger.py` | `client/internal/usage/tracker.go` | تتبع الحركة |
| `gui/launcher.py` | `client/main.go` + Wails | الواجهة |

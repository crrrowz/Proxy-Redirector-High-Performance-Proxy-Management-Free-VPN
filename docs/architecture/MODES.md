# 🔀 أوضاع التشغيل — Self-Hosted vs SaaS

---

## الوضع 1: Self-Hosted (محلي)

### متى يُستخدم
- المستخدم يريد تشغيل كل شيء على جهازه
- لا يريد الاعتماد على سيرفر خارجي
- يستخدم بروكسيات خاصة أو مجانية
- نسخة مجانية / مفتوحة المصدر

### المعمارية
```
┌───────────────── جهاز واحد ─────────────────┐
│                                               │
│  Engine.exe                Client.exe         │
│  ┌────────────┐           ┌──────────────┐   │
│  │ gRPC :50051│◄─────────►│ gRPC client  │   │
│  │ REST :9090 │           │ SOCKS5 :1080 │   │
│  │ SQLite DB  │           │ HTTP   :8080 │   │
│  │ data.json  │           │ Wails GUI    │   │
│  └────────────┘           └──────────────┘   │
│                                               │
└─────────────────────┬─────────────────────────┘
                      │ LAN
              📱📱📱 أجهزة الشبكة
```

### الإعدادات
```json
{
  "MODE": "self-hosted",
  "GRPC_PORT": 50051,
  "GRPC_HOST": "127.0.0.1",
  "REST_PORT": 9090,
  "DATABASE": "sqlite",
  "PROXIES_FILE": "data/data.json",
  "AUTH_ENABLED": false,
  "FETCH_ENABLED": true
}
```

### الفروقات
| الميزة | السلوك |
|--------|--------|
| **مصدر البروكسيات** | ملف `data.json` محلي + جلب من الإنترنت |
| **المصادقة** | بدون (أو اختيارية بـ username/password) |
| **gRPC** | `localhost:50051` بدون TLS |
| **الاستهلاك** | غير محدود |
| **الأجهزة** | غير محدودة |
| **التحديثات** | يدوي أو auto-check فقط |
| **Database** | SQLite محلي |
| **AdBlock** | طبقة واحدة (على Engine) |
| **Relay** | لا يوجد — اتصال مباشر بالبروكسي |

---

## الوضع 2: SaaS (سحابي)

### متى يُستخدم
- نموذج تجاري (اشتراكات)
- المستخدم يدفع مقابل خدمة
- بروكسيات خاصة عالية الجودة
- Relay servers متعددة المناطق

### المعمارية
```
☁️ Cloud (VPS)
┌──────────────────────────────────────────────┐
│  Engine.exe (Central API)                     │
│  ┌──────────────────┐  ┌──────────────────┐  │
│  │ gRPC :50051 (TLS)│  │ REST :9090       │  │
│  │ PostgreSQL       │  │ Stripe Webhooks  │  │
│  │ Redis            │  │ Admin Dashboard  │  │
│  └────────┬─────────┘  └──────────────────┘  │
│           │ gRPC internal                     │
│  ┌────────▼─────────┐                        │
│  │ Relay Servers     │                        │
│  │ US / EU / Asia    │                        │
│  │ TLS 1.3 tunnels   │                        │
│  └──────────────────┘                        │
└──────────────────┬───────────────────────────┘
                   │ TLS over Internet
🖥️ User Device
┌──────────────────▼───────────────────────────┐
│  Client.exe                                   │
│  ┌──────────────────┐                        │
│  │ gRPC client (TLS)│                        │
│  │ JWT Auth         │                        │
│  │ TLS Tunnel→Relay │                        │
│  │ SOCKS5 :1080     │                        │
│  │ HTTP   :8080     │                        │
│  │ Usage Tracking   │                        │
│  │ Wails GUI        │                        │
│  └──────────────────┘                        │
└──────────────────────────────────────────────┘
```

### الإعدادات (Engine — على السيرفر)
```json
{
  "MODE": "saas",
  "GRPC_PORT": 50051,
  "GRPC_HOST": "0.0.0.0",
  "GRPC_TLS_CERT": "/etc/ssl/engine.crt",
  "GRPC_TLS_KEY": "/etc/ssl/engine.key",
  "REST_PORT": 9090,
  "DATABASE": "postgres",
  "DATABASE_URL": "postgres://user:pass@localhost:5432/proxydb",
  "REDIS_URL": "redis://localhost:6379",
  "AUTH_ENABLED": true,
  "JWT_SECRET": "...",
  "STRIPE_KEY": "sk_live_...",
  "STRIPE_WEBHOOK_SECRET": "whsec_..."
}
```

### الإعدادات (Client — عند المستخدم)
```json
{
  "MODE": "saas",
  "ENGINE_ADDRESS": "api.proxyredirector.com:50051",
  "ENGINE_TLS": true,
  "SOCKS5_PORT": 1080,
  "HTTP_PORT": 8080
}
```

### الفروقات
| الميزة | السلوك |
|--------|--------|
| **مصدر البروكسيات** | Engine يديرها على السيرفر — Client لا يراها |
| **المصادقة** | JWT (email + password + device fingerprint) |
| **gRPC** | عبر الإنترنت مع TLS + certificate pinning |
| **الاستهلاك** | محدود حسب الباقة (Free: 500MB, Pro: 200GB) |
| **الأجهزة** | محدودة حسب الباقة (Free: 1, Pro: 5) |
| **التحديثات** | Auto-updater مدمج |
| **Database** | PostgreSQL + Redis |
| **AdBlock** | طبقتين (Engine + Client) |
| **Relay** | TLS tunnel عبر relay servers |

---

## كيف يحدد الكود الوضع

```go
// في Engine
switch cfg.Mode {
case "self-hosted":
    db = sqlite.NewDB(cfg.SQLitePath)
    grpcServer.StartInsecure(cfg.GRPCPort)
    // لا relay, لا JWT, لا usage limits
case "saas":
    db = postgres.NewDB(cfg.DatabaseURL)
    cache = redis.NewClient(cfg.RedisURL)
    grpcServer.StartTLS(cfg.GRPCPort, cfg.TLSCert, cfg.TLSKey)
    auth.EnableJWT(cfg.JWTSecret)
    billing.InitStripe(cfg.StripeKey)
    relay.StartAll(cfg.RelayConfigs)
}

// في Client
switch cfg.Mode {
case "self-hosted":
    grpcClient.ConnectInsecure("localhost:" + cfg.EnginePort)
    // لا login, لا usage tracking
case "saas":
    grpcClient.ConnectTLS(cfg.EngineAddress)
    auth.Login(email, password, deviceFingerprint)
    usage.StartReporting(sessionID)
}
```

---

## الميزات المشتركة (تعمل في كلا الوضعين)

- ✅ فحص بروكسيات
- ✅ Scoring + Ranking
- ✅ Failover ذكي
- ✅ AdBlock (طبقة واحدة على الأقل)
- ✅ SOCKS5 + HTTP broadcasting
- ✅ تتبع الأجهزة المتصلة
- ✅ System Tray
- ✅ GUI

## الميزات الحصرية لـ SaaS

- 🔒 JWT Auth + Device Fingerprint
- 🔒 Usage Tracking + Quotas
- 🔒 Relay Servers (multi-region)
- 🔒 Stripe Billing
- 🔒 Admin Dashboard
- 🔒 Marketing Website
- 🔒 Auto-updater

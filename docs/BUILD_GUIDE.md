# 🗺️ دليل البناء — ابدأ من هنا

> هذا الملف يمشيك خطوة بخطوة من الصفر حتى تطبيقين EXE يعملان.
> كل خطوة تبني على التي قبلها. لا تتخطَّ أي خطوة.
> عند كل خطوة ستجد: ماذا تفعل → كيف تتأكد أنها نجحت → ثم الخطوة التالية.

---

## 📍 أين أنت الآن

المشروع الحالي (`Proxy_redirector/`) هو تطبيق Python أحادي.
هدفك: تحويله إلى **برنامجين Go منفصلين** في مجلد `proxy-redirector-v3/`.

```
المجلد الجاهز: proxy-redirector-v3/
├── engine/          ← ستبني Engine.exe هنا
├── client/          ← ستبني Client.exe هنا
├── shared/          ← كود مشترك بينهما
├── proto/           ← تعريف gRPC (جاهز)
├── data/            ← ملفات البيانات
├── scripts/         ← أدوات بناء
├── docs/            ← التوثيق (أنت تقرأه)
├── go.work          ← Go workspace (جاهز)
└── shared/models/proxy.go  ← أنواع البيانات (جاهز)
```

**ملفات جاهزة مسبقاً:**
- `go.work` + كل `go.mod` files
- `proto/engine/v1/engine.proto` — تعريف gRPC كامل
- `shared/models/proxy.go` — أنواع البيانات المشتركة

---

# ═══════════════════════════════════════
# المرحلة 0: تجهيز بيئة العمل ✅ (مُنجزة)
# ═══════════════════════════════════════
#
# ✅ تم: protoc + gRPC plugins مثبتة
# ✅ تم: Proto stubs مولّدة (engine.pb.go + engine_grpc.pb.go)
# ✅ تم: shared/utils/network.go مُصلح
# ✅ تم: go mod tidy على كل module
# ✅ تم: go build ./shared/... ناجح
# ✅ تم: data.json منسوخ (9037 بروكسي)
# ✅ تم: scripts/gen_proto.ps1 جاهز
#
# ابدأ مباشرة من المرحلة 1 ↓
#

## الخطوة 0.1: تأكد من الأدوات

افتح PowerShell وتأكد:
```powershell
go version          # يجب 1.21+
protoc --version    # يجب v3+
node --version      # يجب 20+ (لـ Wails frontend لاحقاً)
```

إذا `protoc` غير موجود:
```powershell
winget install Google.Protobuf
```

ثبّت Go plugins لـ protoc:
```powershell
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
```

✅ **نجاح:** كل الأوامر الثلاثة تُرجع إصدار.

---

## الخطوة 0.2: ولّد Go stubs من Proto

هذه الخطوة تحوّل ملف `engine.proto` إلى كود Go يمكنك استخدامه.

```powershell
cd "D:\files\Contracted projects\IdeaProjects\Proxy_redirector\proxy-redirector-v3"

# أنشئ مجلدات الخرج
mkdir -Force engine\internal\server\pb
mkdir -Force client\internal\engine\pb

# ولّد
protoc `
    --proto_path=proto `
    --go_out=engine\internal\server\pb --go_opt=paths=source_relative `
    --go-grpc_out=engine\internal\server\pb --go-grpc_opt=paths=source_relative `
    engine/v1/engine.proto

# انسخ لمجلد Client أيضاً
Copy-Item engine\internal\server\pb\* client\internal\engine\pb\ -Force
```

✅ **نجاح:** تجد ملفين في `engine/internal/server/pb/`:
- `engine.pb.go` — الـ messages
- `engine_grpc.pb.go` — الـ service interfaces

---

## الخطوة 0.3: أصلح shared/utils/network.go

الملف الموجود فيه خطأ (ينقصه `import "fmt"`). أصلحه أو احذفه وأعد كتابته.
ما تحتاجه فعلياً: دالة `GetLocalIPs()` و `IsLocalIP()`.

ثم شغّل:
```powershell
cd shared; go mod tidy; cd ..
cd engine; go mod tidy; cd ..
cd client; go mod tidy; cd ..
```

✅ **نجاح:** `go build ./shared/...` و `go build ./engine/...` بدون أخطاء.

---

## الخطوة 0.4: تأكد أن كل شيء يُترجم

```powershell
go build ./shared/...
go build ./engine/...
```

إذا ظهرت أخطاء dependencies، شغّل `go mod tidy` في المجلد المعني.

✅ **نجاح:** لا أخطاء.

---

# ═══════════════════════════════════════
# المرحلة 1: Engine Core (ابدأ هنا فعلياً)
# ═══════════════════════════════════════

> **الترتيب مهم.** كل ملف يعتمد على الذي قبله.
> ابنِ كل ملف ← اختبره ← ثم انتقل للتالي.

## 🔢 ترتيب بناء Engine:

```
1. config.go         ← الإعدادات (يحتاجه كل شيء)
2. checker.go        ← فحص البروكسيات (المحرك الأساسي)
3. manager.go        ← إدارة Pool + Scoring (يعتمد على checker)
4. handler.go        ← Failover (يعتمد على manager)
5. engine.go         ← AdBlock (مستقل)
6. analytics.go      ← تحليلات (مستقل)
7. fetcher.go        ← جلب بروكسيات (مستقل)
8. grpc_server.go    ← gRPC server (يربط كل شيء)
9. rest_api.go       ← REST API للـ dashboard (يعتمد على 8)
10. main.go          ← Entry point (يشغّل كل شيء)
```

---

### الخطوة 1.1: Config — `engine/internal/config/config.go` ✅ (مُنجزة)

📖 **راجع:** `docs/engine/06_SERVER_CONFIG_MAIN.md` (قسم Config)
📖 **مرجع Python:** `Proxy_redirector/config.py`

**ماذا تبني:**
- struct `Config` مع كل الإعدادات (ports, timeouts, scoring weights...)
- دالة `LoadConfig(path)` — تحمّل من ملف JSON
- دالة `Save()` — تحفظ
- دالة `Update(key, value)` — تحدّث إعداد
- كل إعداد له قيمة افتراضية

**كيف تختبر:**
```go
cfg, _ := config.LoadConfig("test_config.json") // لا يوجد → يستخدم defaults
fmt.Println(cfg.GRPCPort) // 50051
cfg.Update("GRPC_PORT", "9999")
fmt.Println(cfg.GRPCPort) // 9999
```

✅ **نجاح:** `go test ./engine/internal/config/` يمر.

---

### الخطوة 1.2: Proxy Checker — `engine/internal/proxy/checker.go` ✅ (مُنجزة)

📖 **راجع:** `docs/engine/01_CHECKER.md`
📖 **مرجع Python:** `Proxy_redirector/core/proxy_checker.py`

**ماذا تبني:**
- `CheckSingle(proxy, config) → CheckResult` — فحص بروكسي واحد
- `CheckBatch(proxies, config) → []CheckResult` — فحص بالتوازي (goroutines + semaphore)
- `DetectRealIP() → string` — كشف IP الحقيقي

**نصائح التنفيذ:**
- ابدأ بـ `CheckSingle` فقط — SOCKS5 أولاً
- استخدم `golang.org/x/net/proxy` للـ SOCKS5 dialer
- الـ semaphore في Go = `make(chan struct{}, maxConcurrent)`
- Anonymity check = قارن IP الاستجابة مع RealIP

**كيف تختبر:**
```go
// شغّل mock SOCKS5 server محلياً
// أو اختبر على بروكسي حقيقي من data.json
result := proxy.CheckSingle(ctx, testProxy, cfg)
fmt.Println(result.Alive, result.ResponseTimeMs)
```

✅ **نجاح:** يفحص بروكسي واحد ويرجع alive/dead + speed.

---

### الخطوة 1.3: Proxy Manager — `engine/internal/proxy/manager.go` ✅ (مُنجزة)

📖 **راجع:** `docs/engine/02_MANAGER.md`
📖 **مرجع Python:** `Proxy_redirector/core/proxy_manager.py`

**ماذا تبني:**
- `NewManager(config)` — يُنشئ manager
- `LoadProxies()` — يحمّل من `data/data.json`
- `UpdateStatus(results)` — يحدّث حالة بروكسيات بعد الفحص
- `CalculateScore(proxy)` — خوارزمية Scoring
- `GetAliveProxies()` — البروكسيات الحية
- `GetDashboardData()` — أفضل 30 مرتبة

**⚠️ مهم:** استخدم `sync.RWMutex` — هذا الـ struct سيُقرأ من عدة goroutines.

**كيف تختبر:**
```go
mgr := proxy.NewManager(cfg)
proxies, _ := mgr.LoadProxies() // يحمّل من data.json
results := proxy.CheckBatch(ctx, proxies[:10], checkCfg)
mgr.UpdateStatus(results)
dashboard := mgr.GetDashboardData()
// يجب أن يُرجع البروكسيات مرتبة حسب Score
```

✅ **نجاح:** يحمّل بروكسيات، يفحصها، يرتبها حسب Score.

---

### الخطوة 1.4: Failover — `engine/internal/failover/handler.go` ✅ (مُنجزة)

📖 **راجع:** `docs/engine/03_FAILOVER.md`
📖 **مرجع Python:** `Proxy_redirector/core/failover_handler.py`

**ماذا تبني:**
- `NewHandler(manager)` — يعتمد على Manager
- `Initialize()` — يختار أفضل بروكسي أولي
- `CurrentProxy()` — يرجع النشط
- `RefreshBest()` — يعيد اختيار الأفضل
- `SuggestSwitch()` — يبدّل عند الفشل
- `ForceSelect(proxy)` — اختيار يدوي
- `Subscribe() → chan` — إشعار عند التبديل

**كيف تختبر:**
```go
handler := failover.NewHandler(mgr)
handler.Initialize()
fmt.Println(handler.CurrentProxy().Address()) // أفضل بروكسي

// اشترك للتحديثات
updates := handler.Subscribe()
go func() {
    for p := range updates {
        fmt.Println("switched to:", p.Address())
    }
}()

handler.RefreshBest() // قد يبدّل إذا وُجد أفضل
```

✅ **نجاح:** يختار بروكسي ويبدّل عند الحاجة.

---

### الخطوة 1.5: AdBlock — `engine/internal/adblock/engine.go` ✅ (مُنجزة)

📖 **راجع:** `docs/engine/04_ADBLOCK.md`
📖 **مرجع Python:** `Proxy_redirector/core/adblock_manager.py`

**ماذا تبني:**
- `NewEngine(filePath)` — يحمّل من blocklist.json
- `ShouldBlock(domain) → (blocked, category)` — 3 مراحل: whitelist → exact → wildcard
- `AddRule / RemoveRule / AddWhitelist`
- `GetStats()` — إحصائيات

**⚠️ نقطة حرجة:** فحص parent domains.
`ShouldBlock("ads.tracker.example.com")` يجب يفحص أيضاً `tracker.example.com` و `example.com`.

**كيف تختبر:**
```go
ab := adblock.NewEngine("blocklist.json")
blocked, cat := ab.ShouldBlock("doubleclick.net") // true, "ads"
blocked, cat = ab.ShouldBlock("google.com")        // false, ""
```

✅ **نجاح:** يحجب الدومينات المعروفة ويسمح للبقية.

---

### الخطوة 1.6: Analytics + Fetcher ⏭️ (مؤجلة للنسخة القادمة)

📖 **راجع:** `docs/engine/05_ANALYTICS_FETCHER.md`

هذان مستقلان — يمكنك بناءهما بأي ترتيب أو تأجيلهما.
- **Analytics:** يسجّل كل فحص ويحسب reliability score
- **Fetcher:** يجلب بروكسيات جديدة من مصادر عامة

---

### 🎯 نقطة توقف — اختبر Engine Core

عند هذه النقطة يجب أن يكون عندك:
```
engine/internal/
├── config/config.go       ✓
├── proxy/
│   ├── checker.go         ✓
│   ├── manager.go         ✓
│   ├── analytics.go       (اختياري الآن)
│   └── fetcher.go         (اختياري الآن)
├── failover/handler.go    ✓
└── adblock/engine.go      ✓
```

**اختبار شامل:**
اكتب ملف `engine/cmd/engine/test_core.go` مؤقت:
```go
func main() {
    cfg, _ := config.LoadConfig("config.json")
    mgr := proxy.NewManager(cfg)
    mgr.LoadProxies()
    
    // فحص أول 20 بروكسي
    results := proxy.CheckBatch(ctx, mgr.GetAllProxies()[:20], checkCfg)
    mgr.UpdateStatus(results)
    
    // failover
    handler := failover.NewHandler(mgr)
    handler.Initialize()
    fmt.Printf("Active: %s (score: %.1f)\n", handler.CurrentProxy().Address(), ...)
    
    // adblock
    ab := adblock.NewEngine("blocklist.json")
    fmt.Println(ab.ShouldBlock("doubleclick.net")) // true
    fmt.Println(ab.ShouldBlock("google.com"))      // false
    
    // dashboard
    for _, item := range mgr.GetDashboardData()[:5] {
        fmt.Printf("%s — score: %.1f — alive: %v\n", item.Proxy.Address(), item.Score, item.Status.Alive)
    }
}
```

✅ **نجاح:** يفحص بروكسيات، يختار الأفضل، يحجب إعلانات. **أنت الآن نقلت 80% من منطق Python إلى Go.**

---

# ═══════════════════════════════════════
# المرحلة 2: Engine Server
# ═══════════════════════════════════════

### الخطوة 2.1: gRPC Server — `engine/internal/server/grpc_server.go` ✅ (مُنجزة)

📖 **راجع:** `docs/engine/06_SERVER_CONFIG_MAIN.md` (قسم gRPC)

**ماذا تبني:**
- struct `GRPCServer` يحتوي على manager, failover, adblock, analytics
- تنفّذ كل method من `enginev1.ProxyEngineServer` interface
- أهم methods أولاً: `Connect`, `Disconnect`, `GetEngineStatus`, `GetActiveProxy`
- `StreamProxyUpdates` — أجّلها لو صعبة، نفّذها لاحقاً

**كيف تختبر:**
```powershell
# شغّل Engine
go run ./engine/cmd/engine/

# في terminal ثاني، استخدم grpcurl:
grpcurl -plaintext localhost:50051 engine.v1.ProxyEngine/GetEngineStatus
```

إذا لم يكن عندك `grpcurl`:
```powershell
go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest
```

✅ **نجاح:** gRPC server يعمل وتستطيع استدعاء methods.

---

### الخطوة 2.2: REST API — `engine/internal/server/rest_api.go` ✅ (مُنجزة)

📖 **راجع:** `docs/engine/06_SERVER_CONFIG_MAIN.md` (قسم REST)

---

### الخطوة 2.3: Main — `engine/cmd/engine/main.go` ✅ (مُنجزة)

**ماذا تبني:**
- يحمّل Config
- يُنشئ Manager, Failover, AdBlock, Analytics
- يكشف Real IP
- يشغّل gRPC server (goroutine)
- يشغّل REST API server (goroutine)
- يشغّل background tasks: maintain_pool, discovery
- ينتظر Ctrl+C (signal.Notify)
- graceful shutdown

**كيف تختبر:**
```powershell
go run ./engine/cmd/engine/
# يجب يطبع:
# Engine started (mode: self-hosted)
# gRPC server listening on :50051
# REST API listening on :9090
# Real IP: x.x.x.x
# Pool: 150 total, 12 alive
```

✅ **نجاح:** Engine.exe يعمل! **Ctrl+C** يوقفه بشكل نظيف.

```powershell
# بناء EXE
go build -o build/engine.exe ./engine/cmd/engine/
```

---

# ═══════════════════════════════════════
# المرحلة 3: Client Core
# ═══════════════════════════════════════

> Engine.exe يعمل الآن. حان وقت Client.exe.

## 🔢 ترتيب بناء Client:

```
1. grpc_client.go     ← الاتصال بـ Engine
2. connector.go       ← إعادة اتصال تلقائي
3. socks5.go          ← SOCKS5 server محلي
4. http_proxy.go      ← HTTP proxy server محلي
5. tracker.go         ← تتبع الاستهلاك
6. clients.go         ← تتبع الأجهزة المتصلة
7. config.go          ← إعدادات Client
```

---

### الخطوة 3.1: gRPC Client — `client/internal/engine/grpc_client.go`

📖 **راجع:** `docs/client/01_CORE_MODULES.md` (قسم gRPC Client)

**ماذا تبني:**
- `NewGRPCClient(address)` — يتصل بـ Engine
- `RequestConnect(region, protocol)` → يستدعي Engine.Connect
- `GetActiveProxy()` → يستدعي Engine.GetActiveProxy
- `GetEngineStatus()` → يستدعي Engine.GetEngineStatus

**كيف تختبر:**
```go
// تأكد أن Engine.exe يعمل أولاً!
client := engine.NewGRPCClient("localhost:50051")
client.Connect(ctx)
status, _ := client.GetEngineStatus()
fmt.Println(status.Running) // true
proxy, _ := client.GetActiveProxy()
fmt.Println(proxy.Ip, proxy.Port) // البروكسي النشط
```

✅ **نجاح:** Client يتصل بـ Engine عبر gRPC ويحصل على بيانات.

---

### الخطوة 3.2: SOCKS5 Server — `client/internal/proxy/socks5.go`

📖 **راجع:** `docs/client/01_CORE_MODULES.md` (قسم SOCKS5)
📖 **مرجع Python:** `Proxy_redirector/servers/socks5_server.py`

**ماذا تبني:**
- `NewSocks5Server(failoverProvider)` — يحتاج interface يعطيه البروكسي النشط
- `Start("0.0.0.0", 1080)` — يبدأ الاستماع
- يقبل اتصال SOCKS5 → يمرره عبر البروكسي النشط (من Engine)

**⚠️ هذا أصعب ملف.** خذ وقتك. ابدأ بالتسلسل:
1. استقبل اتصال TCP
2. SOCKS5 handshake (version 0x05)
3. Auth negotiation
4. CONNECT request → استخرج الهدف (domain:port)
5. افتح اتصال بالهدف عبر البروكسي
6. `io.Copy` ثنائي الاتجاه

**كيف تختبر:**
```powershell
# شغّل Engine + Client
# ثم اضبط Firefox proxy على SOCKS5 localhost:1080
# افتح أي موقع — يجب يعمل عبر البروكسي
```

أو بـ curl:
```powershell
curl --socks5 127.0.0.1:1080 http://httpbin.org/ip
# يجب يرجع IP البروكسي وليس IP الحقيقي
```

✅ **نجاح:** تتصفح الإنترنت عبر البروكسي من خلال SOCKS5 المحلي.

---

### الخطوة 3.3: HTTP Proxy — `client/internal/proxy/http_proxy.go`

📖 **مرجع Python:** `Proxy_redirector/servers/http_proxy_server.py`

نفس فكرة SOCKS5 لكن ببروتوكول HTTP:
- `CONNECT` method → HTTPS tunneling
- HTTP requests → forwarding

**كيف تختبر:**
```powershell
curl --proxy http://127.0.0.1:8080 http://httpbin.org/ip
```

✅ **نجاح:** HTTP proxy يعمل أيضاً.

---

### 🎯 نقطة توقف — اختبر النظام الكامل

```powershell
# Terminal 1: شغّل Engine
.\build\engine.exe

# Terminal 2: شغّل Client (مؤقتاً بدون GUI)
go run .\client\cmd\test_client.go

# Terminal 3: اختبر
curl --socks5 127.0.0.1:1080 http://httpbin.org/ip
curl --proxy http://127.0.0.1:8080 http://httpbin.org/ip

# من الهاتف: اضبط proxy WiFi على IP_الكمبيوتر:8080
```

✅ **نجاح: هاتفك يتصفح عبر البروكسي!** 🎉
**هذا هو الـ MVP — البرنامجان يعملان معاً.**

---

# ═══════════════════════════════════════
# المرحلة 4: Client GUI (Wails)
# ═══════════════════════════════════════

### الخطوة 4.1: تثبيت Wails

```powershell
go install github.com/wailsapp/wails/v2/cmd/wails@latest
wails doctor  # يتأكد من المتطلبات
```

### الخطوة 4.2: تهيئة مشروع Wails

**⚠️ مهم:** لا تشغّل `wails init` في مجلد client/ الموجود — سيكتب فوق ملفاتك.
بدلاً من ذلك:
1. شغّل `wails init -n temp_client -t react-ts` في مجلد مؤقت
2. انسخ `frontend/` و `wails.json` من temp_client إلى `client/`
3. عدّل `client/main.go` ليستخدم Wails API
4. احذف temp_client

📖 **راجع:** `docs/client/02_GUI.md` لتفاصيل:
- Wails main.go config (frameless window, size, colors)
- Go bindings (app.go — كل method = JS function)
- شاشات React الـ 6
- Design System (colors, fonts)

### الخطوة 4.3: ابنِ الشاشات بالترتيب

```
1. AppLayout + TitleBar + TabBar     ← الهيكل الأساسي
2. HomeScreen + ConnectButton        ← أهم شاشة
3. DevicesScreen                     ← الأجهزة المتصلة
4. SettingsScreen                    ← الإعدادات
5. SplashScreen + LoginScreen        ← (SaaS mode فقط)
```

**كيف تختبر:**
```powershell
cd client
wails dev  # يفتح نافذة التطبيق مع hot reload
```

✅ **نجاح:** تطبيق بنافذة بدون إطار، زر اتصال يعمل، تتصفح من الهاتف عبره.

---

# ═══════════════════════════════════════
# المرحلة 5: لمسات نهائية
# ═══════════════════════════════════════

بالترتيب حسب الأهمية:

| # | المهمة | الملف | راجع |
|---|--------|-------|------|
| 5.1 | System Tray | `client/internal/tray/tray.go` | `docs/client/03_SYSTEM.md` |
| 5.2 | Auto-start | `client/internal/config/` | `docs/client/03_SYSTEM.md` |
| 5.3 | Client config.json | `client/internal/config/config.go` | `docs/client/03_SYSTEM.md` |
| 5.4 | Logging | `shared/utils/logger.go` | `docs/architecture/ERROR_LOGGING.md` |
| 5.5 | Error handling | كل الملفات | `docs/architecture/ERROR_LOGGING.md` |

---

# ═══════════════════════════════════════
# المرحلة 6: أمان (قبل التوزيع)
# ═══════════════════════════════════════

📖 **راجع:** `docs/architecture/SECURITY.md`

| # | المهمة | الوصف |
|---|--------|-------|
| 6.1 | garble build | `garble build` بدل `go build` — يشفّر البايناري |
| 6.2 | Anti-debugging | `IsDebuggerPresent()` في main.go |
| 6.3 | Code signing | شهادة Authenticode لـ Windows |
| 6.4 | Single instance | Mutex يمنع تشغيل نسختين |

---

# ═══════════════════════════════════════
# المرحلة 7: SaaS (مستقبلاً)
# ═══════════════════════════════════════

📖 **راجع:** `docs/architecture/MODES.md` + `docs/engine/07_DATABASE.md` + `docs/engine/08_RELAY.md`

هذه المرحلة ليست ضرورية للـ MVP. تبنيها عندما تريد تحويل المشروع لمنتج تجاري.

| # | المهمة | 
|---|--------|
| 7.1 | PostgreSQL schema + migrations |
| 7.2 | JWT Auth في Engine |
| 7.3 | Stripe billing |
| 7.4 | Relay Servers |
| 7.5 | Usage tracking + quotas |
| 7.6 | Auto-updater |
| 7.7 | Marketing website (Next.js) |
| 7.8 | Admin dashboard |

---

# ═══════════════════════════════════════
# ملخص: خريطة الطريق
# ═══════════════════════════════════════

```
أنت هنا
    ↓
[المرحلة 0] تجهيز البيئة ← 30 دقيقة
    ↓
[المرحلة 1] Engine Core ← 1-2 أسبوع
    ├── config.go
    ├── checker.go        ⭐ أهم ملف
    ├── manager.go        ⭐ ثاني أهم ملف
    ├── handler.go
    ├── engine.go (adblock)
    ├── analytics.go
    └── fetcher.go
    ↓
[المرحلة 2] Engine Server ← 3-5 أيام
    ├── grpc_server.go
    ├── rest_api.go
    └── main.go
    ↓
[المرحلة 3] Client Core ← 1 أسبوع
    ├── grpc_client.go
    ├── socks5.go          ⭐ أصعب ملف
    ├── http_proxy.go
    └── connector.go
    ↓
    🎯 MVP — البرنامجان يعملان! ←←← هذا هدفك الأول
    ↓
[المرحلة 4] GUI (Wails) ← 1-2 أسبوع
    ↓
[المرحلة 5] لمسات نهائية ← 3 أيام
    ↓
[المرحلة 6] أمان ← 1-2 يوم
    ↓
    🚀 أول إصدار جاهز للتوزيع
    ↓
[المرحلة 7] SaaS ← 3-4 أسابيع (مستقبلاً)
```

---

## 📚 فهرس المراجع السريع

عندما تعمل على ملف معين، ارجع لهذه المواصفات:

| الملف الذي تبنيه | ملف المواصفات |
|-------------------|---------------|
| `config.go` | `docs/engine/06_SERVER_CONFIG_MAIN.md` §3 |
| `checker.go` | `docs/engine/01_CHECKER.md` |
| `manager.go` | `docs/engine/02_MANAGER.md` |
| `handler.go` | `docs/engine/03_FAILOVER.md` |
| `engine.go` (adblock) | `docs/engine/04_ADBLOCK.md` |
| `analytics.go` + `fetcher.go` | `docs/engine/05_ANALYTICS_FETCHER.md` |
| `grpc_server.go` | `docs/engine/06_SERVER_CONFIG_MAIN.md` §1 |
| `rest_api.go` | `docs/engine/06_SERVER_CONFIG_MAIN.md` §2 |
| `main.go` (engine) | `docs/engine/06_SERVER_CONFIG_MAIN.md` §4 |
| `socks5.go` | `docs/client/01_CORE_MODULES.md` §1 |
| `http_proxy.go` | `docs/client/01_CORE_MODULES.md` §2 |
| `grpc_client.go` | `docs/client/01_CORE_MODULES.md` §3 |
| `connector.go` | `docs/client/01_CORE_MODULES.md` §4 |
| GUI / Wails | `docs/client/02_GUI.md` |
| Tray / Updater | `docs/client/03_SYSTEM.md` |
| Error handling | `docs/architecture/ERROR_LOGGING.md` |
| Build / Release | `docs/architecture/BUILD_RELEASE.md` |
| Security | `docs/architecture/SECURITY.md` |
| Database | `docs/engine/07_DATABASE.md` |
| Relay | `docs/engine/08_RELAY.md` |
| Testing | `docs/architecture/TESTING.md` |
| Proto | `docs/architecture/PROTO_SPEC.md` |
| Modes | `docs/architecture/MODES.md` |

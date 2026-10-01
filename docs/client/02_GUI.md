# 🖥️ Client GUI — واجهة المستخدم (Wails + React)

> **الملفات المستهدفة:**
> - `client/main.go` — Wails entry point
> - `client/app.go` — Go bindings exposed to frontend
> - `client/frontend/src/` — React application

---

## Wails Architecture

```
client/
├── main.go                 # Wails bootstrap + window config
├── app.go                  # Go struct مع methods = JS bindings
│
└── frontend/src/
    ├── main.tsx             # React entry
    ├── App.tsx              # Router + Layout
    ├── globals.css          # Design tokens + global styles
    │
    ├── screens/             # الشاشات الرئيسية
    │   ├── SplashScreen.tsx
    │   ├── LoginScreen.tsx
    │   ├── HomeScreen.tsx
    │   ├── RotationScreen.tsx   # Surge Mode / Dynamic Rotation
    │   ├── DevicesScreen.tsx
    │   ├── SettingsScreen.tsx
    │   └── AccountScreen.tsx
    │
    ├── components/
    │   ├── ui/              # أساسيات
    │   │   ├── Button.tsx
    │   │   ├── Input.tsx
    │   │   ├── Modal.tsx
    │   │   ├── Toast.tsx
    │   │   ├── Toggle.tsx
    │   │   ├── ProgressBar.tsx
    │   │   ├── Dropdown.tsx
    │   │   └── QRCode.tsx
    │   │
    │   ├── layout/
    │   │   ├── TitleBar.tsx     # Custom frameless title bar
    │   │   ├── TabBar.tsx       # Bottom navigation
    │   │   └── AppLayout.tsx    # Main layout wrapper
    │   │
    │   ├── home/
    │   │   ├── ConnectButton.tsx    # زر الاتصال الدائري الكبير
    │   │   ├── RegionSelector.tsx   # dropdown مناطق
    │   │   ├── StatusBar.tsx        # حالة + سرعة
    │   │   └── UsageMeter.tsx       # شريط استهلاك
    │   │
    │   └── devices/
    │       ├── DeviceList.tsx
    │       ├── ConnectionInfo.tsx
    │       └── SetupGuide.tsx
    │
    ├── hooks/
    │   ├── useConnection.ts     # state: connected/disconnected/connecting
    │   ├── useAuth.ts           # JWT login/logout
    │   ├── useUsage.ts          # bandwidth used/remaining
    │   ├── useRegions.ts        # available regions
    │   ├── useDevices.ts        # connected LAN devices
    │   └── useEngine.ts         # engine status
    │
    ├── stores/                  # Zustand state management
    │   ├── connectionStore.ts
    │   ├── authStore.ts
    │   └── settingsStore.ts
    │
    ├── lib/
    │   ├── wailsBridge.ts       # typed wrappers around Wails bindings
    │   └── utils.ts
    │
    └── types/
        ├── connection.ts
        ├── proxy.ts
        ├── region.ts
        └── device.ts
```

---

## Go Bindings (app.go)

Wails يكشف Go methods تلقائياً لـ JavaScript:

```go
// App هو الـ struct الرئيسي — كل method عامة تصبح JS function
type App struct {
    ctx        context.Context
    connector  *engine.Connector
    socks5     *proxy.Socks5Server
    httpProxy  *proxy.HttpProxyServer
    tracker    *usage.Tracker
    clients    *network.ClientTracker
    config     *config.Config
}

// ── Connection ──
func (a *App) Connect(region, protocol string) ConnectResult
func (a *App) Disconnect() error
func (a *App) GetConnectionState() string          // "disconnected"|"connecting"|"connected"
func (a *App) GetActiveProxy() *ProxyInfo

// ── Engine Status ──
func (a *App) GetEngineStatus() *EngineStatus
func (a *App) GetPoolSummary() *PoolSummary
func (a *App) GetProxies(limit int) []ProxyInfo

// ── Regions ──
func (a *App) GetRegions() []Region

// ── Usage ──
func (a *App) GetUsage() UsageInfo                 // bytes_up, bytes_down, remaining

// ── Devices ──
func (a *App) GetConnectedDevices() []DeviceInfo
func (a *App) GetLocalIP() string
func (a *App) GetPorts() PortsInfo                 // socks5_port, http_port

// ── Settings ──
func (a *App) GetSettings() map[string]string
func (a *App) UpdateSettings(key, value string) error
func (a *App) GetSocks5Port() int
func (a *App) GetHttpPort() int

// ── AdBlock ──
func (a *App) GetBlockStats() *BlockStats
func (a *App) ToggleAdBlock(enabled bool)

// ── Auth (SaaS) ──
func (a *App) Login(email, password string) (*AuthResult, error)
func (a *App) Logout() error
func (a *App) IsLoggedIn() bool
func (a *App) GetUserInfo() *UserInfo

// ── System ──
func (a *App) MinimizeToTray()
func (a *App) Quit()
```

في JavaScript يُستدعى:
```typescript
import { Connect, GetEngineStatus } from '../wailsjs/go/main/App';
const result = await Connect("US", "socks5");
```

---

## Design System

### Colors (Dark Theme)
```css
:root {
  --bg-primary: #0a0e17;         /* الخلفية الرئيسية */
  --bg-secondary: #111827;       /* البطاقات */
  --bg-tertiary: #1f2937;        /* الحقول */
  --border: #374151;             /* الحدود */
  
  --text-primary: #f9fafb;       /* النص الرئيسي */
  --text-secondary: #9ca3af;     /* النص الثانوي */
  --text-muted: #6b7280;         /* النص الباهت */
  
  --accent-green: #10b981;       /* متصل / نجاح */
  --accent-red: #ef4444;         /* خطأ / غير متصل */
  --accent-blue: #3b82f6;        /* معلومات / أزرار */
  --accent-yellow: #f59e0b;      /* تحذير */
  --accent-purple: #8b5cf6;      /* مميز */
  
  --glow-green: 0 0 20px rgba(16, 185, 129, 0.3);
  --glow-red: 0 0 20px rgba(239, 68, 68, 0.3);
  
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-full: 9999px;
  
  --font-family: 'Inter', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  --transition-fast: 150ms ease;
  --transition-normal: 300ms ease;
  --transition-slow: 500ms ease;
}
```

### Typography
```css
.heading-1  { font-size: 24px; font-weight: 700; }
.heading-2  { font-size: 20px; font-weight: 600; }
.heading-3  { font-size: 16px; font-weight: 600; }
.body       { font-size: 14px; font-weight: 400; }
.body-small { font-size: 12px; font-weight: 400; }
.caption    { font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
```

---

## Screen Specs

### 1. SplashScreen

```
┌──────────────────────────────────┐
│                                  │
│                                  │
│         [Logo - pulse]           │
│       Proxy Redirector           │
│                                  │
│       ████████░░░ 80%            │
│                                  │
└──────────────────────────────────┘
```

- مدة: 1-3 ثانية
- خلفية: gradient `#0a0e17 → #111827`
- Logo: animation `pulse` أو `fadeIn`
- Progress bar أسفل اللوغو
- منطق: يفحص JWT → إذا صالح → HomeScreen، إذا لا → LoginScreen

### 2. LoginScreen (SaaS mode فقط)

```
┌──────────────────────────────────┐
│                                  │
│         [Logo]                   │
│     Proxy Redirector             │
│                                  │
│  ┌──────────────────────────┐   │
│  │ 📧 Email                 │   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │ 🔒 Password          👁  │   │
│  └──────────────────────────┘   │
│  ☑ Remember me                  │
│                                  │
│  ┌──────────────────────────┐   │
│  │      تسجيل الدخول        │   │
│  └──────────────────────────┘   │
│                                  │
│  ─────── أو ────────            │
│  [G] Continue with Google       │
│                                  │
│  نسيت كلمة المرور؟  │ إنشاء حساب │
│                                  │
└──────────────────────────────────┘
```

- يُعرض فقط في SaaS mode
- في self-hosted يتخطاها مباشرة

### 3. HomeScreen

```
┌──────────────────────────────────┐
│  ─  □  ✕           Proxy Redirector │ ← TitleBar (draggable)
├──────────────────────────────────┤
│                                  │
│         ┌──────────────┐        │
│         │              │        │
│         │   ⏻ CONNECT  │        │  ← دائرة كبيرة 120px
│         │              │        │     رمادي=off, أخضر+glow=on
│         └──────────────┘        │     spinning=connecting
│                                  │
│     🟢 متصل  │  45ms  │  US     │  ← StatusBar
│                                  │
│  ┌────────────────────────────┐ │
│  │ 🌍 المنطقة: US - New York  ▼ │ │  ← RegionSelector
│  └────────────────────────────┘ │
│                                  │
│  ┌────────────────────────────┐ │
│  │ 📊 12.5 / 200 GB           │ │  ← UsageMeter
│  │ ████████████░░░░░░░  63%   │ │     أخضر<50%, أصفر<80%, أحمر>80%
│  └────────────────────────────┘ │
│                                  │
│  ┌────────────────────────────┐ │
│  │ 📱 3 أجهزة متصلة          │ │
│  └────────────────────────────┘ │
│                                  │
├──────────────────────────────────┤
│  [🏠 Home] [🔄 Surge] [📱 Devices] [⚙ Set] │ ← TabBar
└──────────────────────────────────┘
```

#### ConnectButton States
| الحالة | اللون | الأيقونة | النص | الـ Animation |
|--------|-------|---------|------|---------------|
| Disconnected | رمادي `#374151` | `⏻` | "اتصل" | none |
| Connecting | أزرق `#3b82f6` | spinner | "جاري الاتصال..." | rotate 360° infinite |
| Connected | أخضر `#10b981` + glow | `⏻` | "متصل" | pulse glow |
| Error | أحمر `#ef4444` | `⚠` | "فشل — اضغط للمحاولة" | shake |

### 4. DevicesScreen

```
┌──────────────────────────────────┐
│  ─  □  ✕           Proxy Redirector │
├──────────────────────────────────┤
│                                  │
│  الأجهزة المتصلة عبر شبكتك      │
│                                  │
│  ┌────────────────────────────┐ │
│  │ 📱 192.168.1.50            │ │
│  │    SOCKS5 → youtube.com    │ │
│  ├────────────────────────────┤ │
│  │ 🖥️ 192.168.1.102           │ │
│  │    HTTP → github.com       │ │
│  └────────────────────────────┘ │
│                                  │
│  ── معلومات البث ──             │
│  IP: 192.168.1.100              │
│  SOCKS5: 1080   HTTP: 8080      │
│  [📋 نسخ]                       │
│                                  │
│  ┌──────────────┐               │
│  │  ▓▓▓▓▓▓▓▓▓▓  │              │  ← QR Code
│  │  ▓▓▓▓▓▓▓▓▓▓  │              │     proxy_host=IP&socks5_port=1080
│  │  ▓▓▓▓▓▓▓▓▓▓  │              │
│  └──────────────┘               │
│                                  │
├──────────────────────────────────┤
│  [🏠 Home] [🔄 Surge] [📱 Devices] [⚙ Set] │
└──────────────────────────────────┘
```

### 5. SettingsScreen

```
┌──────────────────────────────────┐
│  ─  □  ✕           Proxy Redirector │
├──────────────────────────────────┤
│  الإعدادات                       │
│                                  │
│  ── الاتصال ──                   │
│  SOCKS5 Port  [1080     ]       │
│  HTTP Port    [8080     ]       │
│                                  │
│  ── المصادقة المحلية ──          │
│  تفعيل          [●━━━━━━━○]     │ ← Toggle
│  اسم المستخدم  [proxy    ]      │
│  كلمة المرور   [••••     ]      │
│                                  │
│  ── حجب الإعلانات ──             │
│  تفعيل          [●━━━━━━━○]     │
│  إعلانات        [●━━━━━━━○]     │
│  تتبع           [●━━━━━━━○]     │
│  برمجيات ضارة   [●━━━━━━━○]     │
│                                  │
│  ── النظام ──                    │
│  بدء تلقائي     [●━━━━━━━○]     │
│  اتصال تلقائي   [○━━━━━━━●]     │
│  تصغير للـ Tray  [●━━━━━━━○]    │
│                                  │
│  ── المظهر ──                    │
│  الثيم: [داكن ▼]                 │
│  اللغة: [عربي ▼]                 │
│                                  │
│  ── حول ──                       │
│  الإصدار: 3.0.0                  │
│  [التحقق من تحديثات]              │
│                                  │
│  [🔴 تسجيل خروج]                 │
│                                  │
├──────────────────────────────────┤
│  [🏠 Home] [🔄 Surge] [📱 Devices] [⚙ Set] │
└──────────────────────────────────┘
```

### 6. AccountScreen (SaaS)

```
┌──────────────────────────────────┐
│  الحساب                          │
│                                  │
│  📧 user@example.com             │
│  📦 الباقة: Pro                  │
│  📅 التجديد: 28 يوليو 2026       │
│                                  │
│  ── الاستهلاك (آخر 7 أيام) ──    │
│  ┌────────────────────────────┐ │
│  │  ▁▃▅█▅▃▁   12.5 GB        │ │  ← mini chart
│  └────────────────────────────┘ │
│                                  │
│  ── الأجهزة المسجلة (3/5) ──     │
│  ✅ Hassan's PC (هذا الجهاز)     │
│  📱 iPhone 15                   │
│  🖥️ MacBook Air          [🗑]   │
│                                  │
│  [⬆ ترقية الباقة]                │
│  [🌐 إدارة حسابك على الموقع]     │
└──────────────────────────────────┘
```

---

## Wails main.go Config

```go
func main() {
    app := NewApp()
    
    err := wails.Run(&options.App{
        Title:            "Proxy Redirector",
        Width:            420,
        Height:           680,
        MinWidth:         380,
        MinHeight:        600,
        Frameless:        true,        // نافذة بدون إطار
        StartHidden:      false,
        BackgroundColour: &options.RGBA{R: 10, G: 14, B: 23, A: 255}, // #0a0e17
        OnStartup:        app.startup,
        OnShutdown:       app.shutdown,
        Bind: []interface{}{
            app,
        },
        Windows: &windows.Options{
            WebviewIsTransparent: true,
            WindowIsTranslucent:  false,
        },
        SingleInstanceLock: &options.SingleInstanceLock{
            UniqueId: "proxy-redirector-v3-client",
        },
    })
}
```

---

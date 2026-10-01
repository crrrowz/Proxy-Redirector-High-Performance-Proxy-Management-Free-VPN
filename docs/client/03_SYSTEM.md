# 🔧 Client System Integration — Tray + Auto-Start + Updater + Security

> **ملفات Go المستهدفة:**
> - `client/internal/tray/tray.go`
> - `client/internal/updater/updater.go`
> - `client/internal/auth/device.go`
> - `client/internal/auth/keychain.go`
> - `client/internal/config/config.go`

---

## 1. System Tray

### الواجهة
```go
type TrayManager struct {
    icon      *systray.MenuItem
    app       *App
    state     ConnectionState
}

func NewTrayManager(app *App) *TrayManager
func (t *TrayManager) Start()
func (t *TrayManager) UpdateState(state ConnectionState)
func (t *TrayManager) Stop()
```

### القائمة
```
Right-click على الأيقونة:
├── 🟢 متصل — US (أو 🔴 غير متصل)
├── ──────────
├── اتصل / قطع الاتصال
├── المنطقة ►
│   ├── 🚀 أفضل موقع (Auto)
│   ├── 🇺🇸 US - New York
│   ├── 🇩🇪 DE - Frankfurt
│   └── ...
├── ──────────
├── فتح التطبيق
├── ──────────
└── خروج
```

### الأيقونة
| الحالة | اللون | Tooltip |
|--------|-------|---------|
| غير متصل | رمادي | "Proxy Redirector — غير متصل" |
| جاري الاتصال | أصفر | "Proxy Redirector — جاري الاتصال..." |
| متصل | أخضر | "Proxy Redirector — متصل (US) — 12.5GB" |
| خطأ | أحمر | "Proxy Redirector — خطأ في الاتصال" |

---

## 2. Auto-Start

### Windows
```go
func EnableAutoStart() error {
    // HKCU\Software\Microsoft\Windows\CurrentVersion\Run
    key, _ := registry.OpenKey(registry.CURRENT_USER, `Software\Microsoft\Windows\CurrentVersion\Run`, registry.SET_VALUE)
    defer key.Close()
    return key.SetStringValue("ProxyRedirector", exePath)
}

func DisableAutoStart() error {
    key, _ := registry.OpenKey(registry.CURRENT_USER, `Software\Microsoft\Windows\CurrentVersion\Run`, registry.SET_VALUE)
    defer key.Close()
    return key.DeleteValue("ProxyRedirector")
}

func IsAutoStartEnabled() bool {
    key, _ := registry.OpenKey(registry.CURRENT_USER, `Software\Microsoft\Windows\CurrentVersion\Run`, registry.QUERY_VALUE)
    defer key.Close()
    _, _, err := key.GetStringValue("ProxyRedirector")
    return err == nil
}
```

### macOS
```go
// Login Item via LaunchAgent plist in ~/Library/LaunchAgents/
```

### Linux
```go
// .desktop file in ~/.config/autostart/
```

---

## 3. Auto-Updater

### الواجهة
```go
type Updater struct {
    currentVersion string
    checkURL       string             // "/api/v1/app/version"
    onUpdate       func(UpdateInfo)   // callback لإشعار الـ GUI
}

type UpdateInfo struct {
    Version    string
    Changelog  string
    DownloadURL string
    Checksum   string    // SHA256
    Mandatory  bool
}

func NewUpdater(currentVersion, apiBase string) *Updater
func (u *Updater) Check() (*UpdateInfo, error)
func (u *Updater) Download(info *UpdateInfo, progress func(int)) (string, error)
func (u *Updater) Apply(filePath string) error
```

### التسلسل
```
1. عند فتح التطبيق: GET /api/v1/app/version
2. مقارنة currentVersion مع latest
3. إذا أحدث → إشعار GUI (Modal)
4. المستخدم يضغط "تحديث الآن":
   a. تنزيل EXE جديد في %TEMP%
   b. شريط تقدم
   c. التحقق من SHA256 checksum
   d. "إعادة تشغيل لتطبيق التحديث"
5. التطبيق يُغلق
6. العملية الجديدة تستبدل الملف القديم
7. تشغيل النسخة الجديدة
```

---

## 4. Device Fingerprint

### الواجهة
```go
func GenerateFingerprint() string {
    // hash من: MAC Address + CPU ID + Hostname + OS Version
    data := getMACAddress() + getCPUID() + getHostname() + getOSVersion()
    hash := sha256.Sum256([]byte(data))
    return hex.EncodeToString(hash[:])
}

func getMACAddress() string   // أول network interface non-loopback
func getCPUID() string        // CPUID instruction أو registry
func getHostname() string     // os.Hostname()
func getOSVersion() string    // runtime.GOOS + version
```

---

## 5. OS Keychain (JWT Storage)

### الواجهة
```go
type KeychainManager struct{}

func (k *KeychainManager) SaveToken(service, key, token string) error
func (k *KeychainManager) GetToken(service, key string) (string, error)
func (k *KeychainManager) DeleteToken(service, key string) error
```

### التنفيذ حسب OS
| OS | Backend |
|----|---------|
| Windows | Windows Credential Manager (`advapi32.dll`) |
| macOS | macOS Keychain (`security` command) |
| Linux | `gnome-keyring` أو ملف مشفّر |

### المخزّن
```
Service: "proxy-redirector"
Keys: "access_token", "refresh_token", "device_id"
```

---

## 6. Client Config

```go
type ClientConfig struct {
    // Connection
    Mode          string `json:"mode"`           // "self-hosted" | "saas"
    EngineAddress string `json:"engine_address"` // "localhost:50051" | "api.proxyredirector.com:50051"
    EngineTLS     bool   `json:"engine_tls"`     // false | true
    
    // Local Servers
    Socks5Port    int    `json:"socks5_port"`    // 1080
    HttpPort      int    `json:"http_port"`      // 8080
    ListenHost    string `json:"listen_host"`    // "0.0.0.0"
    
    // Auth (local proxy auth)
    LocalAuthEnabled bool   `json:"local_auth_enabled"` // false
    LocalUsername     string `json:"local_username"`
    LocalPassword     string `json:"local_password"`
    LocalWhitelist    []string `json:"local_whitelist"` // ["192.168.", "10.", "127."]
    
    // System
    AutoStart      bool   `json:"auto_start"`      // false
    AutoConnect    bool   `json:"auto_connect"`     // false
    MinimizeToTray bool   `json:"minimize_to_tray"` // true
    Theme          string `json:"theme"`            // "dark" | "light" | "system"
    Language       string `json:"language"`         // "ar" | "en"
    
    // AdBlock
    AdBlockEnabled bool   `json:"adblock_enabled"`  // true
    
    // SaaS
    LastRegion     string `json:"last_region"`      // آخر منطقة مستخدمة
    LastEmail      string `json:"last_email"`       // للـ remember me
}

func LoadClientConfig(path string) (*ClientConfig, error)
func (c *ClientConfig) Save() error
```

---

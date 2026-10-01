# 🔨 Build, Release & Data Migration

---

## 1. Build Strategy

### المتطلبات
```
- Go 1.26+
- Node.js 20+ (لـ Wails frontend)
- protoc v36+ (لـ gRPC)
- protoc-gen-go + protoc-gen-go-grpc
- Wails CLI v2 (go install github.com/wailsapp/wails/v2/cmd/wails@latest)
- garble (go install mvdan.cc/garble@latest) — للإنتاج فقط
```

### بنية الـ Build

```
scripts/
├── gen_proto.ps1          # توليد Go stubs من proto
├── build_engine.ps1       # بناء Engine.exe
├── build_client.ps1       # بناء Client.exe (Wails)
├── build_all.ps1          # بناء الكل
├── build_release.ps1      # بناء إنتاج (مع garble + signing)
└── dev.ps1                # تشغيل dev mode (Engine + Client)
```

### gen_proto.ps1
```powershell
$ProtoDir = "$PSScriptRoot\..\proto\engine\v1"
$OutEngine = "$PSScriptRoot\..\engine\internal\server\pb"
$OutClient = "$PSScriptRoot\..\client\internal\engine\pb"

# إنشاء مجلدات الخرج
New-Item -ItemType Directory -Force -Path $OutEngine, $OutClient | Out-Null

# توليد
protoc `
    --proto_path="$PSScriptRoot\..\proto" `
    --go_out="$OutEngine" --go_opt=paths=source_relative `
    --go-grpc_out="$OutEngine" --go-grpc_opt=paths=source_relative `
    "engine/v1/engine.proto"

# نسخ لـ Client أيضاً
Copy-Item "$OutEngine\*" "$OutClient\" -Force

Write-Host "✅ Proto files generated"
```

### build_engine.ps1
```powershell
param(
    [switch]$Release,
    [string]$Version = "0.0.1-dev"
)

$OutDir = "$PSScriptRoot\..\build"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$LDFlags = "-X main.Version=$Version -X main.BuildTime=$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')"

if ($Release) {
    # إنتاج: مع garble + تصغير
    garble -literals -tiny -seed=random build `
        -ldflags "$LDFlags -s -w" `
        -o "$OutDir\engine.exe" `
        ".\engine\cmd\engine\"
} else {
    # تطوير: بدون garble
    go build `
        -ldflags "$LDFlags" `
        -o "$OutDir\engine.exe" `
        ".\engine\cmd\engine\"
}

Write-Host "✅ Engine built → $OutDir\engine.exe"
```

### build_client.ps1
```powershell
param(
    [switch]$Release,
    [string]$Version = "0.0.1-dev"
)

$OutDir = "$PSScriptRoot\..\build"
Set-Location "$PSScriptRoot\..\client"

if ($Release) {
    wails build -production -ldflags "-X main.Version=$Version -s -w"
    # garble لا يعمل مباشرة مع Wails — نحتاج hook
} else {
    wails build -ldflags "-X main.Version=$Version"
}

Copy-Item "build\bin\*" "$OutDir\" -Force
Write-Host "✅ Client built → $OutDir\client.exe"
```

### build_all.ps1
```powershell
param([switch]$Release, [string]$Version = "0.0.1-dev")

& "$PSScriptRoot\gen_proto.ps1"
& "$PSScriptRoot\build_engine.ps1" -Version $Version $(if($Release){"-Release"})
& "$PSScriptRoot\build_client.ps1" -Version $Version $(if($Release){"-Release"})

Write-Host "✅ All built in build/"
```

### dev.ps1 (Development Mode)
```powershell
# يشغّل Engine في الخلفية + Client في الأمام
Write-Host "🔧 Starting Engine..."
Start-Process -FilePath "go" -ArgumentList "run ./engine/cmd/engine/" -NoNewWindow

Start-Sleep -Seconds 2

Write-Host "🖥️ Starting Client (Wails dev)..."
Set-Location "$PSScriptRoot\..\client"
wails dev
```

---

## 2. Versioning

### Semantic Versioning: `MAJOR.MINOR.PATCH`
```
3.0.0 — أول إصدار من v3
3.0.1 — إصلاح أخطاء
3.1.0 — ميزة جديدة (مثل منطقة جديدة)
4.0.0 — تغيير كبير (مثل تغيير proto)
```

### كيف يُحقن في البرنامج
```go
// main.go
var (
    Version   = "dev"           // يُحقن عبر -ldflags
    BuildTime = "unknown"
)

func main() {
    log.Info("starting", "version", Version, "build_time", BuildTime)
}
```

---

## 3. Wails Setup (خطوات التهيئة بالضبط)

```powershell
# 1. تثبيت Wails CLI
go install github.com/wailsapp/wails/v2/cmd/wails@latest

# 2. التحقق من المتطلبات
wails doctor

# 3. تهيئة مشروع في مجلد client/
cd "D:\files\Contracted projects\IdeaProjects\Proxy_redirector\proxy-redirector-v3"
wails init -n client -t react-ts -d client

# 4. هذا يُنشئ:
# client/
# ├── main.go          (نعدّله)
# ├── app.go           (نعدّله)
# ├── wails.json       (نعدّله)
# ├── go.mod           (موجود — نعدّل dependencies)
# ├── frontend/
# │   ├── src/
# │   ├── package.json
# │   └── vite.config.ts
# └── build/

# 5. تشغيل dev mode
cd client
wails dev
```

### wails.json المطلوب
```json
{
  "name": "Proxy Redirector",
  "outputfilename": "client",
  "frontend:install": "npm install",
  "frontend:build": "npm run build",
  "frontend:dev:watcher": "npm run dev",
  "frontend:dev:serverUrl": "auto",
  "author": {
    "name": "crrrowz"
  },
  "info": {
    "companyName": "Proxy Redirector",
    "productName": "Proxy Redirector Client",
    "productVersion": "3.0.0",
    "copyright": "© 2026",
    "comments": "Proxy Broadcasting Client"
  }
}
```

### ⚠️ مشاكل معروفة مع Wails + Go Workspace
```
المشكلة: Wails لا يدعم go.work مباشرة
الحل: في client/go.mod نستخدم replace directive:
    replace github.com/crrrowz/proxy-redirector-v3/shared => ../shared

المشكلة: wails dev يفشل إذا go.mod فيه أخطاء
الحل: go mod tidy في client/ أولاً
```

---

## 4. Data Migration (نقل البيانات من v1)

### ملف البيانات الحالي: `Proxy_redirector/data/data.json`

```json
[
  {
    "ip": "1.2.3.4",
    "port": 8080,
    "type": "socks5",
    "username": null,
    "password": null,
    "geolocation": {"country": "US", "city": "New York"}
  }
]
```

### الملف الجديد في v3: `proxy-redirector-v3/data/data.json`

نفس التنسيق — **لا يحتاج تحويل**. فقط نسخ.

### Migration Script
```powershell
# scripts/migrate_data.ps1
$oldPath = "$PSScriptRoot\..\..\data\data.json"
$newPath = "$PSScriptRoot\..\data\data.json"

if (Test-Path $oldPath) {
    Copy-Item $oldPath $newPath
    Write-Host "✅ Migrated $(Get-Content $oldPath | ConvertFrom-Json | Measure-Object | Select -Exp Count) proxies"
} else {
    Write-Host "⚠️ No data.json found at $oldPath"
}
```

### Status File Migration
```
ملف proxy_status.json الحالي:
{"1.2.3.4_8080": {"alive": true, "response_time_ms": 450, ...}}

نفس التنسيق في v3 — ينسخ مباشرة.
ولكن v3 سيعيد بناء الـ status من الصفر عند أول تشغيل (أفضل).
```

### Config Migration
```
config.json الحالي → v3 config.json
- أغلب المفاتيح متوافقة
- مفاتيح جديدة تأخذ defaults
- المفاتيح المحذوفة تُتجاهل
```

---

## 5. Release Checklist

```
□ تحديث VERSION في main.go
□ go test ./... (كل الوحدات)
□ gen_proto.ps1
□ build_all.ps1 -Release -Version "3.0.0"
□ signtool sign (code signing)
□ اختبار يدوي: Engine + Client
□ حساب SHA256 checksums
□ رفع على GitHub Releases
□ تحديث /api/v1/app/version
□ إشعار المستخدمين (auto-update)
```

---

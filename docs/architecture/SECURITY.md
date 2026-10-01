# 🛡️ الأمان والتشفير

> **ينطبق على:** Engine.exe و Client.exe
> **المرحلة:** 5

---

## 1. Binary Obfuscation (Go)

### الأداة: `garble`
```bash
# بدلاً من:
go build -o engine.exe ./cmd/engine/

# نستخدم:
garble -literals -tiny -seed=random build -o engine.exe ./cmd/engine/
```

| الخيار | التأثير |
|--------|---------|
| `-literals` | تشفير كل النصوص الثابتة (strings, URLs, keys) |
| `-tiny` | إزالة أسماء الـ types والـ packages |
| `-seed=random` | عشوائية مختلفة كل بناء |

### النتيجة
- أسماء الـ functions تصبح: `a.b()` بدل `proxy.CheckSingle()`
- النصوص تُفك وقت التشغيل فقط
- لا يمكن قراءة الكود المصدري من الـ binary

---

## 2. Anti-Debugging

```go
// يُفحص عند التشغيل وبشكل دوري
func isDebuggerPresent() bool {
    // Windows: IsDebuggerPresent() API
    kernel32 := syscall.NewLazyDLL("kernel32.dll")
    proc := kernel32.NewProc("IsDebuggerPresent")
    ret, _, _ := proc.Call()
    return ret != 0
}

func antiDebugLoop() {
    ticker := time.NewTicker(5 * time.Second)
    for range ticker.C {
        if isDebuggerPresent() {
            os.Exit(1)  // إغلاق فوري
        }
    }
}
```

---

## 3. Code Signing

### Windows (Authenticode)
```powershell
# باستخدام signtool.exe
signtool sign /f certificate.pfx /p password /t http://timestamp.digicert.com engine.exe
signtool sign /f certificate.pfx /p password /t http://timestamp.digicert.com client.exe
```

### الفائدة
- Windows SmartScreen لا يحذّر المستخدم
- يتحقق المستخدم أن الملف من المصدر الصحيح

---

## 4. TLS Certificate Pinning

```go
// Client يتحقق من شهادة Engine/Relay بـ hash محدد
func pinnedTLSConfig(expectedHash string) *tls.Config {
    return &tls.Config{
        VerifyPeerCertificate: func(rawCerts [][]byte, _ [][]*x509.Certificate) error {
            if len(rawCerts) == 0 {
                return errors.New("no certificates")
            }
            hash := sha256.Sum256(rawCerts[0])
            if hex.EncodeToString(hash[:]) != expectedHash {
                return errors.New("certificate pin mismatch")
            }
            return nil
        },
    }
}
```

---

## 5. Checksum Verification (Auto-Update)

```go
func verifyChecksum(filePath, expectedSHA256 string) error {
    f, _ := os.Open(filePath)
    defer f.Close()
    h := sha256.New()
    io.Copy(h, f)
    actual := hex.EncodeToString(h.Sum(nil))
    if actual != expectedSHA256 {
        return fmt.Errorf("checksum mismatch: expected %s, got %s", expectedSHA256, actual)
    }
    return nil
}
```

---

## 6. JWT Security

### Token Structure
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "client",
  "plan": "pro",
  "device_id": "fingerprint-hash",
  "iat": 1719561600,
  "exp": 1719562500
}
```

### Tokens
| Token | المدة | الاستخدام |
|-------|-------|-----------|
| Access Token | 15 دقيقة | كل طلب API |
| Refresh Token | 30 يوم | تجديد Access Token |

### Security Rules
- Access Token قصير (15 دقيقة) — يقلل خطر السرقة
- Refresh Token يُخزّن في OS Keychain
- `device_id` في JWT — لا يُقبل على جهاز آخر
- Blacklist للـ tokens المُلغاة (Redis)

---

## 7. Single Instance Mutex

```go
func ensureSingleInstance() {
    // Windows: CreateMutex
    kernel32 := syscall.NewLazyDLL("kernel32.dll")
    createMutex := kernel32.NewProc("CreateMutexW")
    name, _ := syscall.UTF16PtrFromString("ProxyRedirectorV3")
    _, _, err := createMutex.Call(0, 0, uintptr(unsafe.Pointer(name)))
    if err.(syscall.Errno) == 183 { // ERROR_ALREADY_EXISTS
        // التطبيق يعمل بالفعل — اعرض النافذة الموجودة
        os.Exit(0)
    }
}
```

---

## ملخص طبقات الأمان

```
┌─────────────────────────────────────────────┐
│ Layer 7: JWT + Device Fingerprint           │
│ Layer 6: Certificate Pinning                │
│ Layer 5: TLS 1.3 (all connections)          │
│ Layer 4: Anti-Debugging checks              │
│ Layer 3: Code Signing (Authenticode)        │
│ Layer 2: Binary Obfuscation (garble)        │
│ Layer 1: Go compiled binary (no source)     │
└─────────────────────────────────────────────┘
```

---

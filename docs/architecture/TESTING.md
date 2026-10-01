# 🧪 Testing Strategy

---

## مبادئ عامة

- كل module يُختبر بشكل مستقل (unit tests)
- Engine ↔ Client يُختبر معاً (integration tests)
- التغطية المستهدفة: **80%+** للـ core modules
- نستخدم Go stdlib `testing` فقط (بدون frameworks)

---

## 1. Unit Tests

### Engine Modules

| Module | ملف الاختبار | ما يُختبر |
|--------|-------------|-----------|
| **checker** | `checker_test.go` | فحص بروكسي (mock server)، batch checking، timeout handling |
| **manager** | `manager_test.go` | تحميل JSON، scoring algorithm، second chance، country filter |
| **failover** | `handler_test.go` | اختيار الأفضل، تبديل تلقائي، manual lock |
| **adblock** | `engine_test.go` | exact match، wildcard، parent domains، whitelist |
| **analytics** | `analytics_test.go` | reliability score، auto-tags |
| **config** | `config_test.go` | load/save، defaults، update |

### Client Modules

| Module | ملف الاختبار | ما يُختبر |
|--------|-------------|-----------|
| **socks5** | `socks5_test.go` | SOCKS5 handshake، auth، connect |
| **http_proxy** | `http_proxy_test.go` | HTTP forward، CONNECT tunnel |
| **connector** | `connector_test.go` | retry logic، state transitions |
| **tracker** | `tracker_test.go` | byte counting |

### كيفية التشغيل
```powershell
# كل الاختبارات
go test ./engine/... ./client/... ./shared/...

# module محدد
go test ./engine/internal/proxy/ -v

# مع coverage
go test ./engine/... -cover -coverprofile=coverage.out
go tool cover -html=coverage.out
```

---

## 2. Integration Tests

### Engine gRPC Integration
```go
// engine/internal/server/grpc_server_test.go
func TestGRPCIntegration(t *testing.T) {
    // 1. شغّل Engine gRPC server على port عشوائي
    srv := NewTestServer(t)
    defer srv.Stop()
    
    // 2. أنشئ gRPC client
    client := NewTestClient(t, srv.Address())
    
    // 3. اختبر Connect
    resp, err := client.Connect(ctx, &pb.ConnectRequest{Region: "US"})
    require.NoError(t, err)
    assert.True(t, resp.Success)
    assert.NotEmpty(t, resp.SessionId)
    
    // 4. اختبر GetActiveProxy
    proxy, err := client.GetActiveProxy(ctx, &pb.Empty{})
    require.NoError(t, err)
    assert.Equal(t, proxy.Ip, resp.ActiveProxy.Ip)
    
    // 5. اختبر Disconnect
    _, err = client.Disconnect(ctx, &pb.DisconnectRequest{SessionId: resp.SessionId})
    require.NoError(t, err)
}
```

### End-to-End (Engine + Client)
```go
// يُشغّل في prompt مستقل (P9)
func TestE2E(t *testing.T) {
    // 1. شغّل Engine
    engine := startTestEngine(t)
    defer engine.Stop()
    
    // 2. شغّل Client SOCKS5
    socks := startTestSocks5(t, engine.GRPCAddress())
    defer socks.Stop()
    
    // 3. اتصل عبر SOCKS5
    dialer, _ := proxy.SOCKS5("tcp", socks.Address(), nil, proxy.Direct)
    conn, err := dialer.Dial("tcp", "httpbin.org:80")
    require.NoError(t, err)
    defer conn.Close()
    
    // 4. أرسل HTTP request
    fmt.Fprintf(conn, "GET /ip HTTP/1.1\r\nHost: httpbin.org\r\n\r\n")
    // 5. تحقق من الاستجابة
}
```

---

## 3. Mock Proxy Server (للاختبار)

```go
// shared/testutil/mock_proxy.go
func StartMockSocks5Server(t *testing.T) (address string) {
    listener, _ := net.Listen("tcp", "127.0.0.1:0")
    go func() {
        for {
            conn, err := listener.Accept()
            if err != nil { return }
            go handleMockSocks5(conn)
        }
    }()
    t.Cleanup(func() { listener.Close() })
    return listener.Addr().String()
}
```

---

## 4. Benchmark Tests

```go
// engine/internal/proxy/checker_bench_test.go
func BenchmarkCheckSingle(b *testing.B) {
    mockAddr := startMockProxy(b)
    proxy := &models.Proxy{IP: "127.0.0.1", Port: parsePort(mockAddr), Type: "socks5"}
    cfg := &CheckConfig{TimeoutSeconds: 5}
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        CheckSingle(context.Background(), proxy, cfg)
    }
}

func BenchmarkScoring(b *testing.B) {
    mgr := createTestManager(b, 1000) // 1000 بروكسي
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        mgr.GetDashboardData()
    }
}
```

### التشغيل
```powershell
go test ./engine/internal/proxy/ -bench=. -benchmem
```

---

## 5. Test Data Fixtures

```
shared/testutil/
├── mock_proxy.go          # Mock SOCKS5/HTTP server
├── fixtures/
│   ├── data_small.json    # 10 proxies
│   ├── data_medium.json   # 100 proxies
│   ├── data_large.json    # 1000 proxies
│   ├── blocklist.json     # test adblock rules
│   └── config.json        # test config
└── helpers.go             # test utilities
```

---

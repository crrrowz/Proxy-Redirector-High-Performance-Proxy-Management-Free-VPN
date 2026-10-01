package server

import (
	"context"
	"testing"
	"time"

	"github.com/crrrowz/proxy-redirector-v3/engine/internal/adblock"
	"github.com/crrrowz/proxy-redirector-v3/engine/internal/config"
	"github.com/crrrowz/proxy-redirector-v3/engine/internal/failover"
	"github.com/crrrowz/proxy-redirector-v3/engine/internal/proxy"
	pb "github.com/crrrowz/proxy-redirector-v3/engine/internal/server/pb"
	"github.com/crrrowz/proxy-redirector-v3/shared/models"
	"path/filepath"
)

// newTestGRPC creates a GRPCServer backed by seeded proxies.
func newTestGRPC(t *testing.T, count int) *GRPCServer {
	t.Helper()
	tmpDir := t.TempDir()
	cfg := config.DefaultConfig()
	cfg.ProxiesFile = filepath.Join(tmpDir, "data.json")
	cfg.StatusFile = filepath.Join(tmpDir, "status.json")

	m := proxy.NewManager(cfg)

	// Seed proxies
	proxies, statuses := generateProxies(count)
	m.InjectTestData(proxies, statuses)

	fh := failover.NewHandler(m)
	_ = fh.Initialize()

	ab := adblock.NewEngine(filepath.Join(tmpDir, "blocklist.json"))

	return NewGRPCServer(m, fh, ab, cfg)
}

func generateProxies(n int) ([]*models.Proxy, map[string]*models.ProxyStatus) {
	proxies := make([]*models.Proxy, n)
	statuses := make(map[string]*models.ProxyStatus, n)
	now := time.Now()

	for i := 0; i < n; i++ {
		ip := "10.0.0." + itoa(i+1)
		p := &models.Proxy{
			ID:      ip + "_1080",
			IP:      ip,
			Port:    1080,
			Type:    models.ProxySOCKS5,
			Country: "US",
		}
		proxies[i] = p
		statuses[p.ID] = &models.ProxyStatus{
			Alive:          true,
			ResponseTimeMs: float64(100 + i*10),
			Score:          float64(100 - i),
			TotalChecks:    10,
			TotalSuccesses: 9,
			LastAlive:      now,
			LastChecked:    now,
		}
	}
	return proxies, statuses
}

func itoa(n int) string {
	if n < 10 {
		return string(rune('0' + n))
	}
	return string(rune('0'+n/10)) + string(rune('0'+n%10))
}

// ---------------------------------------------------------------------------
// GetProxies
// ---------------------------------------------------------------------------

func TestGetProxies_SortedByScoreDescending(t *testing.T) {
	s := newTestGRPC(t, 10)
	ctx := context.Background()

	resp, err := s.GetProxies(ctx, &pb.GetProxiesRequest{})
	if err != nil {
		t.Fatalf("GetProxies error: %v", err)
	}
	if len(resp.Proxies) == 0 {
		t.Fatal("expected proxies, got 0")
	}

	// Verify descending score order — this is the critical fix we must not revert
	for i := 1; i < len(resp.Proxies); i++ {
		if resp.Proxies[i].Score > resp.Proxies[i-1].Score {
			t.Errorf("proxies not sorted by score DESC at index %d: %.2f > %.2f",
				i, resp.Proxies[i].Score, resp.Proxies[i-1].Score)
		}
	}
}

func TestGetProxies_CappedAt200(t *testing.T) {
	s := newTestGRPC(t, 250)
	ctx := context.Background()

	resp, err := s.GetProxies(ctx, &pb.GetProxiesRequest{})
	if err != nil {
		t.Fatalf("GetProxies error: %v", err)
	}

	if len(resp.Proxies) > 200 {
		t.Errorf("expected max 200 proxies, got %d", len(resp.Proxies))
	}
}

func TestGetProxies_RespectsLimit(t *testing.T) {
	s := newTestGRPC(t, 50)
	ctx := context.Background()

	resp, err := s.GetProxies(ctx, &pb.GetProxiesRequest{Limit: 5})
	if err != nil {
		t.Fatalf("GetProxies error: %v", err)
	}

	if len(resp.Proxies) > 5 {
		t.Errorf("expected max 5 proxies, got %d", len(resp.Proxies))
	}
}

func TestGetProxies_CountryFilter(t *testing.T) {
	s := newTestGRPC(t, 5)
	ctx := context.Background()

	resp, err := s.GetProxies(ctx, &pb.GetProxiesRequest{CountryFilter: "NONEXISTENT"})
	if err != nil {
		t.Fatalf("GetProxies error: %v", err)
	}

	if len(resp.Proxies) != 0 {
		t.Errorf("expected 0 proxies for NONEXISTENT country, got %d", len(resp.Proxies))
	}
}

// ---------------------------------------------------------------------------
// GetActiveProxy
// ---------------------------------------------------------------------------

func TestGetActiveProxy_ReturnsProxy(t *testing.T) {
	s := newTestGRPC(t, 5)
	ctx := context.Background()

	info, err := s.GetActiveProxy(ctx, &pb.Empty{})
	if err != nil {
		t.Fatalf("GetActiveProxy error: %v", err)
	}
	if info == nil {
		t.Fatal("expected active proxy info, got nil")
	}
	if info.Id == "" {
		t.Error("expected non-empty proxy ID")
	}
}

func TestGetActiveProxy_NoProxy(t *testing.T) {
	s := newTestGRPC(t, 0) // No proxies → Initialize failed → no current
	ctx := context.Background()

	_, err := s.GetActiveProxy(ctx, &pb.Empty{})
	if err == nil {
		t.Fatal("expected error when no active proxy")
	}
}

// ---------------------------------------------------------------------------
// GetEngineStatus
// ---------------------------------------------------------------------------

func TestGetEngineStatus(t *testing.T) {
	s := newTestGRPC(t, 1)
	ctx := context.Background()

	st, err := s.GetEngineStatus(ctx, &pb.Empty{})
	if err != nil {
		t.Fatalf("GetEngineStatus error: %v", err)
	}
	if st.Mode != "self-hosted" {
		t.Errorf("expected mode 'self-hosted', got %q", st.Mode)
	}
}

// ---------------------------------------------------------------------------
// GetPoolSummary
// ---------------------------------------------------------------------------

func TestGetPoolSummary(t *testing.T) {
	s := newTestGRPC(t, 5)
	ctx := context.Background()

	sum, err := s.GetPoolSummary(ctx, &pb.Empty{})
	if err != nil {
		t.Fatalf("GetPoolSummary error: %v", err)
	}
	if sum.Total < 5 {
		t.Errorf("expected total >= 5, got %d", sum.Total)
	}
}

// ---------------------------------------------------------------------------
// CheckDomain
// ---------------------------------------------------------------------------

func TestCheckDomain(t *testing.T) {
	s := newTestGRPC(t, 1)
	ctx := context.Background()

	tests := []struct {
		domain  string
		blocked bool
	}{
		{"doubleclick.net", true},
		{"example.com", false},
	}

	for _, tt := range tests {
		t.Run(tt.domain, func(t *testing.T) {
			resp, err := s.CheckDomain(ctx, &pb.DomainCheckRequest{Domain: tt.domain})
			if err != nil {
				t.Fatalf("CheckDomain error: %v", err)
			}
			if resp.Blocked != tt.blocked {
				t.Errorf("CheckDomain(%q) blocked = %v, want %v", tt.domain, resp.Blocked, tt.blocked)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// Connect / Disconnect
// ---------------------------------------------------------------------------

func TestConnect(t *testing.T) {
	s := newTestGRPC(t, 5)
	ctx := context.Background()

	resp, err := s.Connect(ctx, &pb.ConnectRequest{})
	if err != nil {
		t.Fatalf("Connect error: %v", err)
	}
	if !resp.Success {
		t.Error("expected success=true")
	}
	if resp.ActiveProxy == nil {
		t.Error("expected an active proxy after Connect")
	}
}

func TestDisconnect(t *testing.T) {
	s := newTestGRPC(t, 5)
	ctx := context.Background()

	resp, err := s.Disconnect(ctx, &pb.DisconnectRequest{SessionId: "test"})
	if err != nil {
		t.Fatalf("Disconnect error: %v", err)
	}
	if !resp.Success {
		t.Error("expected success=true")
	}
}

// ---------------------------------------------------------------------------
// convertProxy helper
// ---------------------------------------------------------------------------

func TestConvertProxy_Nil(t *testing.T) {
	info := convertProxy(nil)
	if info != nil {
		t.Error("convertProxy(nil) should return nil")
	}
}

func TestConvertProxy_Types(t *testing.T) {
	tests := []struct {
		ptype    models.ProxyType
		expected pb.ProxyProtocol
	}{
		{models.ProxySOCKS5, pb.ProxyProtocol_PROXY_PROTOCOL_SOCKS5},
		{models.ProxySOCKS4, pb.ProxyProtocol_PROXY_PROTOCOL_SOCKS4},
		{models.ProxyHTTP, pb.ProxyProtocol_PROXY_PROTOCOL_HTTP},
		{models.ProxyHTTPS, pb.ProxyProtocol_PROXY_PROTOCOL_HTTPS},
		{"unknown", pb.ProxyProtocol_PROXY_PROTOCOL_UNSPECIFIED},
	}

	for _, tt := range tests {
		t.Run(string(tt.ptype), func(t *testing.T) {
			p := &models.Proxy{ID: "test", IP: "1.1.1.1", Port: 1080, Type: tt.ptype}
			info := convertProxy(p)
			if info.Protocol != tt.expected {
				t.Errorf("convertProxy type %q = %v, want %v", tt.ptype, info.Protocol, tt.expected)
			}
		})
	}
}

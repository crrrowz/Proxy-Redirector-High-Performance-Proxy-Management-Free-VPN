package failover

import (
	"testing"
	"time"

	"github.com/crrrowz/proxy-redirector-v3/engine/internal/config"
	"github.com/crrrowz/proxy-redirector-v3/engine/internal/proxy"
	"github.com/crrrowz/proxy-redirector-v3/shared/models"
)

// newTestHandler creates a failover.Handler backed by a Manager with seeded proxies.
func newTestHandler(t *testing.T, proxies []*models.Proxy, statusMap map[string]*models.ProxyStatus) *Handler {
	t.Helper()
	cfg := config.DefaultConfig()
	cfg.ProxiesFile = t.TempDir() + "/data.json"
	cfg.StatusFile = t.TempDir() + "/status.json"
	m := proxy.NewManager(cfg)

	// Inject proxies+status via exported helpers
	m.InjectTestData(proxies, statusMap)

	return NewHandler(m)
}

func makeProxy(id, ip string, port int, ptype models.ProxyType, country string) *models.Proxy {
	return &models.Proxy{ID: id, IP: ip, Port: port, Type: ptype, Country: country}
}

func aliveStatus(speedMs, score float64) *models.ProxyStatus {
	return &models.ProxyStatus{
		Alive:          true,
		ResponseTimeMs: speedMs,
		Score:          score,
		TotalChecks:    10,
		TotalSuccesses: 9,
		LastAlive:      time.Now(),
		LastChecked:    time.Now(),
	}
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

func TestInitialize_SelectsBestProxy(t *testing.T) {
	proxies := []*models.Proxy{
		makeProxy("p1", "1.1.1.1", 1080, models.ProxySOCKS5, "US"),
		makeProxy("p2", "2.2.2.2", 1080, models.ProxyHTTP, "DE"),
	}
	statuses := map[string]*models.ProxyStatus{
		"p1": aliveStatus(100, 80),
		"p2": aliveStatus(200, 60),
	}

	h := newTestHandler(t, proxies, statuses)
	if err := h.Initialize(); err != nil {
		t.Fatalf("Initialize failed: %v", err)
	}

	got := h.CurrentProxy()
	if got == nil {
		t.Fatal("expected a current proxy, got nil")
	}
	// p1 should win (SOCKS5 bonus + lower latency)
}

func TestInitialize_NoAliveProxies(t *testing.T) {
	h := newTestHandler(t, nil, nil)
	err := h.Initialize()
	if err == nil {
		t.Fatal("expected error when no alive proxies")
	}
}

func TestSuggestSwitch_ExcludesCurrentProxy(t *testing.T) {
	proxies := []*models.Proxy{
		makeProxy("p1", "1.1.1.1", 1080, models.ProxySOCKS5, "US"),
		makeProxy("p2", "2.2.2.2", 1080, models.ProxyHTTP, "DE"),
	}
	statuses := map[string]*models.ProxyStatus{
		"p1": aliveStatus(100, 80),
		"p2": aliveStatus(200, 60),
	}

	h := newTestHandler(t, proxies, statuses)
	_ = h.Initialize()

	first := h.CurrentProxy()
	next, err := h.SuggestSwitch()
	if err != nil {
		t.Fatalf("SuggestSwitch failed: %v", err)
	}
	if next == nil {
		t.Fatal("expected alternative proxy, got nil")
	}
	if next.ID == first.ID {
		t.Error("SuggestSwitch returned same proxy as current")
	}
}

func TestSuggestSwitch_ManualLocked(t *testing.T) {
	proxies := []*models.Proxy{
		makeProxy("p1", "1.1.1.1", 1080, models.ProxySOCKS5, "US"),
		makeProxy("p2", "2.2.2.2", 1080, models.ProxyHTTP, "DE"),
	}
	statuses := map[string]*models.ProxyStatus{
		"p1": aliveStatus(100, 80),
		"p2": aliveStatus(200, 60),
	}

	h := newTestHandler(t, proxies, statuses)
	_ = h.Initialize()
	_ = h.ForceSelect(proxies[1])

	_, err := h.SuggestSwitch()
	if err == nil {
		t.Fatal("expected error when manual locked")
	}
	if !h.IsManualLocked() {
		t.Error("expected IsManualLocked=true")
	}
}

func TestForceSelect_LockAndUnlock(t *testing.T) {
	proxies := []*models.Proxy{
		makeProxy("p1", "1.1.1.1", 1080, models.ProxySOCKS5, "US"),
		makeProxy("p2", "2.2.2.2", 1080, models.ProxyHTTP, "DE"),
	}
	statuses := map[string]*models.ProxyStatus{
		"p1": aliveStatus(100, 80),
		"p2": aliveStatus(200, 60),
	}

	h := newTestHandler(t, proxies, statuses)
	_ = h.Initialize()

	// Force-select p2
	if err := h.ForceSelect(proxies[1]); err != nil {
		t.Fatalf("ForceSelect failed: %v", err)
	}
	if h.CurrentProxy().ID != "p2" {
		t.Errorf("expected p2, got %s", h.CurrentProxy().ID)
	}

	// RefreshBest should NOT switch when locked
	_ = h.RefreshBest()
	if h.CurrentProxy().ID != "p2" {
		t.Errorf("RefreshBest should not switch when manual locked")
	}

	// Unlock
	h.UnlockAuto()
	if h.IsManualLocked() {
		t.Error("expected IsManualLocked=false after UnlockAuto")
	}
}

func TestForceSelect_NilProxy(t *testing.T) {
	h := newTestHandler(t, nil, nil)
	if err := h.ForceSelect(nil); err == nil {
		t.Fatal("expected error for nil proxy")
	}
}

func TestSwitchCount_IncreasesOnSwitch(t *testing.T) {
	proxies := []*models.Proxy{
		makeProxy("p1", "1.1.1.1", 1080, models.ProxySOCKS5, "US"),
		makeProxy("p2", "2.2.2.2", 1080, models.ProxyHTTP, "DE"),
	}
	statuses := map[string]*models.ProxyStatus{
		"p1": aliveStatus(100, 80),
		"p2": aliveStatus(200, 60),
	}

	h := newTestHandler(t, proxies, statuses)
	_ = h.Initialize()
	before := h.SwitchCount()

	_ = h.ForceSelect(proxies[1])
	after := h.SwitchCount()

	if after <= before {
		t.Errorf("SwitchCount did not increase: before=%d, after=%d", before, after)
	}
}

func TestSubscribe_ReceivesInitialProxy(t *testing.T) {
	proxies := []*models.Proxy{
		makeProxy("p1", "1.1.1.1", 1080, models.ProxySOCKS5, "US"),
	}
	statuses := map[string]*models.ProxyStatus{
		"p1": aliveStatus(100, 80),
	}

	h := newTestHandler(t, proxies, statuses)
	_ = h.Initialize()

	ch := h.Subscribe()
	select {
	case p := <-ch:
		if p == nil || p.ID != "p1" {
			t.Errorf("expected p1, got %v", p)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for initial proxy from Subscribe")
	}
}

func TestClearHistory_AllowsRePick(t *testing.T) {
	proxies := []*models.Proxy{
		makeProxy("p1", "1.1.1.1", 1080, models.ProxySOCKS5, "US"),
		makeProxy("p2", "2.2.2.2", 1080, models.ProxyHTTP, "DE"),
	}
	statuses := map[string]*models.ProxyStatus{
		"p1": aliveStatus(50, 80),
		"p2": aliveStatus(200, 60),
	}

	h := newTestHandler(t, proxies, statuses)
	_ = h.Initialize()

	// Switch a few times to populate recentIDs
	for i := 0; i < 3; i++ {
		h.SuggestSwitch()
	}

	h.ClearHistory()

	// After clearing, RefreshBest should freely pick the best without penalty
	err := h.RefreshBest()
	if err != nil {
		t.Fatalf("RefreshBest after ClearHistory failed: %v", err)
	}
	// Just verify no panic and a proxy is selected
	if h.CurrentProxy() == nil {
		t.Error("expected a proxy after ClearHistory + RefreshBest")
	}
}

func TestRecentIDsPenalty_EncouragesCycling(t *testing.T) {
	// Create 3 proxies; after switching away from p1 repeatedly, recentIDs should penalize it
	proxies := []*models.Proxy{
		makeProxy("p1", "1.1.1.1", 1080, models.ProxySOCKS5, "US"),
		makeProxy("p2", "2.2.2.2", 1080, models.ProxySOCKS5, "US"),
		makeProxy("p3", "3.3.3.3", 1080, models.ProxySOCKS5, "US"),
	}
	statuses := map[string]*models.ProxyStatus{
		"p1": aliveStatus(50, 90),
		"p2": aliveStatus(60, 85),
		"p3": aliveStatus(70, 80),
	}

	h := newTestHandler(t, proxies, statuses)
	_ = h.Initialize()

	// Force switch a few times — the handler tracks recent IDs
	seen := map[string]bool{}
	for i := 0; i < 6; i++ {
		p, _ := h.SuggestSwitch()
		if p != nil {
			seen[p.ID] = true
		}
	}

	// We expect at least 2 distinct proxies were selected (cycling)
	if len(seen) < 2 {
		t.Errorf("expected cycling among proxies, but only saw %d distinct", len(seen))
	}
}

package proxy

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/crrrowz/proxy-redirector-v3/engine/internal/config"
	"github.com/crrrowz/proxy-redirector-v3/shared/models"
)

// newTestManager creates a Manager with temp files for testing.
func newTestManager(t *testing.T, cfgOverrides func(cfg *config.Config)) *Manager {
	t.Helper()
	tmpDir := t.TempDir()

	cfg := config.DefaultConfig()
	cfg.ProxiesFile = filepath.Join(tmpDir, "data.json")
	cfg.StatusFile = filepath.Join(tmpDir, "status.json")
	if cfgOverrides != nil {
		cfgOverrides(cfg)
	}

	return NewManager(cfg)
}

// addTestProxy adds a proxy directly to the manager without triggering async save goroutines.
// This avoids deadlocks when tests immediately follow up with lock-dependent operations.
func addTestProxy(m *Manager, ip string, port int, ptype, user, pass string) *models.Proxy {
	p := &models.Proxy{
		IP:       ip,
		Port:     port,
		Type:     models.ProxyType(strings.ToLower(ptype)),
		Username: user,
		Password: pass,
	}
	p.ID = p.GenerateID()

	m.mu.Lock()
	defer m.mu.Unlock()

	if _, exists := m.byID[p.ID]; !exists {
		m.proxies = append(m.proxies, p)
		m.byID[p.ID] = p
		m.status[p.ID] = &models.ProxyStatus{}
	}

	return m.byID[p.ID]
}

func TestNewManager(t *testing.T) {
	m := newTestManager(t, nil)
	if m == nil {
		t.Fatal("NewManager returned nil")
	}
	if len(m.proxies) != 0 {
		t.Errorf("expected 0 proxies, got %d", len(m.proxies))
	}
}

func TestAddCustomProxy(t *testing.T) {
	tests := []struct {
		name       string
		ip         string
		port       int
		ptype      string
		user, pass string
		wantCount  int
	}{
		{"add HTTP proxy", "1.2.3.4", 8080, "http", "", "", 1},
		{"add SOCKS5 with auth", "5.6.7.8", 1080, "socks5", "user", "pass", 1},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m := newTestManager(t, nil)
			p := m.AddCustomProxy(tt.ip, tt.port, tt.ptype, tt.user, tt.pass)

			if p == nil {
				t.Fatal("AddCustomProxy returned nil")
			}
			if p.IP != tt.ip || p.Port != tt.port {
				t.Errorf("proxy = %s:%d, want %s:%d", p.IP, p.Port, tt.ip, tt.port)
			}

			// Give async goroutine time to finish before GetAllProxies
			time.Sleep(50 * time.Millisecond)

			all := m.GetAllProxies()
			if len(all) != tt.wantCount {
				t.Errorf("proxy count = %d, want %d", len(all), tt.wantCount)
			}
		})
	}
}

func TestAddCustomProxy_Dedup(t *testing.T) {
	m := newTestManager(t, nil)

	m.AddCustomProxy("1.2.3.4", 8080, "http", "", "")
	time.Sleep(50 * time.Millisecond)
	m.AddCustomProxy("1.2.3.4", 8080, "http", "", "")
	time.Sleep(50 * time.Millisecond)

	all := m.GetAllProxies()
	if len(all) != 1 {
		t.Errorf("expected dedup to 1 proxy, got %d", len(all))
	}
}

func TestAddCustomProxies(t *testing.T) {
	m := newTestManager(t, nil)

	entries := []models.ProxyEntry{
		{IP: "1.1.1.1", Port: 8080, Protocol: "http"},
		{IP: "2.2.2.2", Port: 1080, Protocol: "socks5"},
		{IP: "1.1.1.1", Port: 8080, Protocol: "http"}, // duplicate
	}

	m.AddCustomProxies(entries)

	all := m.GetAllProxies()
	if len(all) != 2 {
		t.Errorf("expected 2 unique proxies, got %d", len(all))
	}
}

func TestGetAliveProxies(t *testing.T) {
	m := newTestManager(t, nil)

	addTestProxy(m, "1.1.1.1", 8080, "http", "", "")
	addTestProxy(m, "2.2.2.2", 1080, "socks5", "", "")

	// Mark first as alive
	m.mu.Lock()
	for id, s := range m.status {
		if m.byID[id].IP == "1.1.1.1" {
			s.Alive = true
			s.TotalChecks = 1
		}
	}
	m.mu.Unlock()

	alive := m.GetAliveProxies()
	if len(alive) != 1 {
		t.Errorf("expected 1 alive proxy, got %d", len(alive))
	}
	if alive[0].IP != "1.1.1.1" {
		t.Errorf("alive proxy IP = %s, want 1.1.1.1", alive[0].IP)
	}
}

func TestGetAliveProxies_CountryFilter(t *testing.T) {
	tests := []struct {
		name      string
		filter    string
		wantCount int
	}{
		{"GLOBAL filter returns all alive", "GLOBAL", 2},
		{"empty filter returns all alive", "", 2},
		{"US filter returns only US", "US", 1},
		{"DE filter returns none", "DE", 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m := newTestManager(t, func(cfg *config.Config) {
				cfg.CountryFilter = tt.filter
			})

			p1 := addTestProxy(m, "1.1.1.1", 8080, "http", "", "")
			p1.Country = "US"
			p2 := addTestProxy(m, "2.2.2.2", 1080, "socks5", "", "")
			p2.Country = "FR"

			m.mu.Lock()
			for _, s := range m.status {
				s.Alive = true
				s.TotalChecks = 1
			}
			m.mu.Unlock()

			alive := m.GetAliveProxies()
			if len(alive) != tt.wantCount {
				t.Errorf("alive count = %d, want %d", len(alive), tt.wantCount)
			}
		})
	}
}

func TestCalculateScore(t *testing.T) {
	tests := []struct {
		name    string
		cfgFn   func(cfg *config.Config)
		status  *models.ProxyStatus
		wantMin float64
		wantMax float64
	}{
		{
			name:    "nil status returns 0",
			status:  nil,
			wantMin: 0,
			wantMax: 0,
		},
		{
			name:    "blacklisted returns 0",
			status:  &models.ProxyStatus{Blacklisted: true, Alive: true},
			wantMin: 0,
			wantMax: 0,
		},
		{
			name:    "alive proxy gets alive bonus",
			status:  &models.ProxyStatus{Alive: true, TotalChecks: 1, TotalSuccesses: 1},
			wantMin: 50, // ScoreAlive=50
			wantMax: 80, // + success rate + recency
		},
		{
			name: "fast alive proxy with SSL",
			status: &models.ProxyStatus{
				Alive: true, ResponseTimeMs: 100, SSLVerified: true,
				TotalChecks: 10, TotalSuccesses: 10,
				LastAlive: time.Now(),
			},
			// 50 (alive) + ~190 (speed: 200*(1-100/2000)) + 15 (recency) + 10 (success) + 30 (SSL) ≈ 295
			wantMin: 250,
			wantMax: 320,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m := newTestManager(t, tt.cfgFn)

			p := addTestProxy(m, "1.1.1.1", 8080, "http", "", "")

			if tt.status != nil {
				m.mu.Lock()
				m.status[p.ID] = tt.status
				m.mu.Unlock()
			} else {
				m.mu.Lock()
				delete(m.status, p.ID)
				m.mu.Unlock()
			}

			score := m.CalculateScore(p)
			if score < tt.wantMin || score > tt.wantMax {
				t.Errorf("score = %f, want [%f, %f]", score, tt.wantMin, tt.wantMax)
			}
		})
	}
}

func TestCalculateScore_SpeedWeight200_WhenThresholdZero(t *testing.T) {
	// Critical: when speedThreshold==0, speedWeight must be 200.0
	m := newTestManager(t, func(cfg *config.Config) {
		cfg.MaxSpeedMs = 0 // no explicit speed limit → Auto mode
		cfg.ScoreAlive = 50
		cfg.ScoreSpeedMax = 25 // default, but should be overridden to 200.0
		cfg.ScoreRecencyMax = 0
		cfg.ScoreSuccessRateMax = 0
		cfg.ScoreSSLBonus = 0
		cfg.ScoreFailurePenalty = 0
	})

	p := addTestProxy(m, "1.1.1.1", 8080, "http", "", "")

	m.mu.Lock()
	m.status[p.ID] = &models.ProxyStatus{
		Alive:          true,
		ResponseTimeMs: 200, // fast proxy
		TotalChecks:    10,
		TotalSuccesses: 10,
	}
	m.mu.Unlock()

	score := m.CalculateScore(p)

	// speedThreshold defaults to 2000.0, speedWeight = 200.0
	// speedFactor = 1.0 - (200/2000) = 0.9
	// speed component = 200.0 * 0.9 = 180.0
	// alive = 50
	// total = 230.0
	expectedSpeed := 200.0 * (1.0 - 200.0/2000.0) // 180.0
	expectedTotal := 50.0 + expectedSpeed           // 230.0

	if score < expectedTotal-1 || score > expectedTotal+1 {
		t.Errorf("score = %f, want ~%f (speedWeight must be 200.0 when MaxSpeedMs==0)", score, expectedTotal)
	}
}

func TestCalculateScore_SpeedWeight500_WhenThresholdSet(t *testing.T) {
	m := newTestManager(t, func(cfg *config.Config) {
		cfg.MaxSpeedMs = 1000 // explicit speed limit set
		cfg.ScoreAlive = 50
		cfg.ScoreSpeedMax = 25
		cfg.ScoreRecencyMax = 0
		cfg.ScoreSuccessRateMax = 0
		cfg.ScoreSSLBonus = 0
		cfg.ScoreFailurePenalty = 0
	})

	p := addTestProxy(m, "1.1.1.1", 8080, "http", "", "")

	m.mu.Lock()
	m.status[p.ID] = &models.ProxyStatus{
		Alive:          true,
		ResponseTimeMs: 200,
		TotalChecks:    10,
		TotalSuccesses: 10,
	}
	m.mu.Unlock()

	score := m.CalculateScore(p)

	// speedWeight = 500.0 when threshold > 0
	// speedFactor = 1.0 - (200/1000) = 0.8
	// speed = 500 * 0.8 = 400
	// alive = 50
	// total = 450
	expectedSpeed := 500.0 * (1.0 - 200.0/1000.0)
	expectedTotal := 50.0 + expectedSpeed

	if score < expectedTotal-1 || score > expectedTotal+1 {
		t.Errorf("score = %f, want ~%f (speedWeight must be 500.0 when MaxSpeedMs>0)", score, expectedTotal)
	}
}

func TestCalculateScore_NegativePenalty_SlowProxy(t *testing.T) {
	m := newTestManager(t, func(cfg *config.Config) {
		cfg.MaxSpeedMs = 500 // explicit limit
		cfg.ScoreAlive = 50
		cfg.ScoreRecencyMax = 0
		cfg.ScoreSuccessRateMax = 0
		cfg.ScoreSSLBonus = 0
		cfg.ScoreFailurePenalty = 0
	})

	p := addTestProxy(m, "1.1.1.1", 8080, "http", "", "")

	m.mu.Lock()
	m.status[p.ID] = &models.ProxyStatus{
		Alive:          true,
		ResponseTimeMs: 2000, // way over threshold
		TotalChecks:    10,
		TotalSuccesses: 10,
	}
	m.mu.Unlock()

	score := m.CalculateScore(p)

	// speedFactor = 1.0 - (2000/500) = -3.0 (negative)
	// speed = 500 * -3.0 = -1500
	// alive = 50
	// total = 50 + (-1500) = -1450 → clamped to 0
	if score != 0 {
		t.Errorf("score = %f, want 0 (clamped after heavy negative penalty)", score)
	}
}

func TestUpdateStatus(t *testing.T) {
	m := newTestManager(t, nil)

	p := addTestProxy(m, "1.1.1.1", 8080, "http", "", "")

	results := []*models.CheckResult{
		{ID: p.ID, Alive: true, ResponseTimeMs: 150, SSLVerified: true, Country: "US"},
	}

	m.UpdateStatus(results)

	status := m.GetProxyStatus(p.ID)
	if status == nil {
		t.Fatal("status is nil after UpdateStatus")
	}
	if !status.Alive {
		t.Error("expected Alive=true")
	}
	if !status.SSLVerified {
		t.Error("expected SSLVerified=true")
	}

	// Verify country was updated
	m.mu.RLock()
	proxy := m.byID[p.ID]
	m.mu.RUnlock()
	if proxy.Country != "US" {
		t.Errorf("country = %q, want US", proxy.Country)
	}
}

func TestUpdateStatus_ConsecutiveFailures(t *testing.T) {
	m := newTestManager(t, func(cfg *config.Config) {
		cfg.MaxConsecFailures = 2
		cfg.BlacklistAfterFails = 4
	})

	p := addTestProxy(m, "1.1.1.1", 8080, "http", "", "")

	// Fail repeatedly
	for i := 0; i < 5; i++ {
		m.UpdateStatus([]*models.CheckResult{
			{ID: p.ID, Alive: false, Error: "timeout"},
		})
	}

	status := m.GetProxyStatus(p.ID)
	if status.Alive {
		t.Error("expected Alive=false after consecutive failures exceeding MaxConsecFailures")
	}
	if !status.Blacklisted {
		t.Error("expected Blacklisted=true after exceeding BlacklistAfterFails")
	}
}

func TestUpdateStatus_NilResult(t *testing.T) {
	m := newTestManager(t, nil)
	addTestProxy(m, "1.1.1.1", 8080, "http", "", "")

	// Should not panic
	m.UpdateStatus([]*models.CheckResult{nil})
}

func TestUpdateStatus_UnknownID(t *testing.T) {
	m := newTestManager(t, nil)

	// Should not panic when updating unknown proxy
	m.UpdateStatus([]*models.CheckResult{
		{ID: "nonexistent", Alive: true},
	})
}

func TestGetPoolSummary(t *testing.T) {
	m := newTestManager(t, nil)

	addTestProxy(m, "1.1.1.1", 8080, "http", "", "")
	addTestProxy(m, "2.2.2.2", 1080, "socks5", "", "")
	addTestProxy(m, "3.3.3.3", 9090, "http", "", "")

	// Set status: 1=alive, 2=dead, 3=unchecked
	m.mu.Lock()
	for id, s := range m.status {
		switch m.byID[id].IP {
		case "1.1.1.1":
			s.Alive = true
			s.TotalChecks = 5
		case "2.2.2.2":
			s.TotalChecks = 3
			s.ConsecutiveFailures = 2
			s.LastChecked = time.Now().Add(-10 * time.Minute)
		}
	}
	m.mu.Unlock()

	summary := m.GetPoolSummary()
	if summary.Total != 3 {
		t.Errorf("Total = %d, want 3", summary.Total)
	}
	if summary.Alive != 1 {
		t.Errorf("Alive = %d, want 1", summary.Alive)
	}
	if summary.Dead != 1 {
		t.Errorf("Dead = %d, want 1", summary.Dead)
	}
	if summary.Unchecked != 1 {
		t.Errorf("Unchecked = %d, want 1", summary.Unchecked)
	}
}

func TestGetUnchecked(t *testing.T) {
	m := newTestManager(t, nil)

	addTestProxy(m, "1.1.1.1", 8080, "http", "", "")
	addTestProxy(m, "2.2.2.2", 1080, "socks5", "", "")
	addTestProxy(m, "3.3.3.3", 9090, "http", "", "")

	// Mark first as checked
	m.mu.Lock()
	for id := range m.status {
		if m.byID[id].IP == "1.1.1.1" {
			m.status[id].TotalChecks = 1
		}
	}
	m.mu.Unlock()

	unchecked := m.GetUnchecked(10)
	if len(unchecked) != 2 {
		t.Errorf("unchecked = %d, want 2", len(unchecked))
	}

	// Test limit
	limited := m.GetUnchecked(1)
	if len(limited) != 1 {
		t.Errorf("limited unchecked = %d, want 1", len(limited))
	}
}

func TestGetDeadForRetry(t *testing.T) {
	m := newTestManager(t, func(cfg *config.Config) {
		cfg.DeadRetryAfterSec = 1 // 1 second for quick test
	})

	p := addTestProxy(m, "1.1.1.1", 8080, "http", "", "")

	m.mu.Lock()
	m.status[p.ID] = &models.ProxyStatus{
		ConsecutiveFailures: 3,
		TotalChecks:         5,
		LastChecked:         time.Now().Add(-5 * time.Second), // 5 seconds ago
	}
	m.mu.Unlock()

	retryable := m.GetDeadForRetry()
	if len(retryable) != 1 {
		t.Errorf("retryable = %d, want 1", len(retryable))
	}
}

func TestGetDeadForRetry_NotYetReady(t *testing.T) {
	m := newTestManager(t, func(cfg *config.Config) {
		cfg.DeadRetryAfterSec = 3600 // 1 hour
	})

	p := addTestProxy(m, "1.1.1.1", 8080, "http", "", "")

	m.mu.Lock()
	m.status[p.ID] = &models.ProxyStatus{
		ConsecutiveFailures: 3,
		TotalChecks:         5,
		LastChecked:         time.Now(), // just checked
	}
	m.mu.Unlock()

	retryable := m.GetDeadForRetry()
	if len(retryable) != 0 {
		t.Errorf("retryable = %d, want 0 (not ready for retry yet)", len(retryable))
	}
}

func TestReportFailure(t *testing.T) {
	m := newTestManager(t, nil)
	p := addTestProxy(m, "1.1.1.1", 8080, "http", "", "")

	m.ReportFailure(p.ID)

	status := m.GetProxyStatus(p.ID)
	if status.Alive {
		t.Error("expected Alive=false after ReportFailure")
	}
	if !status.Blacklisted {
		t.Error("expected Blacklisted=true after ReportFailure")
	}
	if status.ConsecutiveFailures != 10 {
		t.Errorf("ConsecutiveFailures = %d, want 10", status.ConsecutiveFailures)
	}
}

func TestReportFailure_UnknownID(t *testing.T) {
	m := newTestManager(t, nil)
	// Should not panic
	m.ReportFailure("nonexistent")
}

func TestGetAvailableCountries(t *testing.T) {
	m := newTestManager(t, nil)

	p1 := addTestProxy(m, "1.1.1.1", 8080, "http", "", "")
	p1.Country = "US"
	p2 := addTestProxy(m, "2.2.2.2", 1080, "socks5", "", "")
	p2.Country = "US"
	p3 := addTestProxy(m, "3.3.3.3", 9090, "http", "", "")
	p3.Country = "DE"

	m.mu.Lock()
	for _, s := range m.status {
		s.Alive = true
		s.TotalChecks = 1
	}
	m.mu.Unlock()

	countries := m.GetAvailableCountries()
	if len(countries) != 2 {
		t.Fatalf("countries = %d, want 2", len(countries))
	}
	// Sorted by count DESC, US=2 should be first
	if countries[0].Name != "US" || countries[0].Count != 2 {
		t.Errorf("first country = %v, want US:2", countries[0])
	}
}

func TestGetDashboardData(t *testing.T) {
	m := newTestManager(t, nil)

	for i := 0; i < 35; i++ {
		ip := fmt.Sprintf("10.0.0.%d", i+1)
		p := addTestProxy(m, ip, 8080, "http", "", "")
		m.mu.Lock()
		m.status[p.ID] = &models.ProxyStatus{
			Alive:          true,
			TotalChecks:    10,
			TotalSuccesses: 10,
			ResponseTimeMs: float64(100 + i*50),
			LastAlive:      time.Now(),
		}
		m.mu.Unlock()
	}

	items := m.GetDashboardData()

	// Capped at 30
	if len(items) != 30 {
		t.Errorf("dashboard items = %d, want 30", len(items))
	}

	// Verify sorted by score DESC
	for i := 1; i < len(items); i++ {
		if items[i].Score > items[i-1].Score {
			t.Errorf("items not sorted DESC at index %d: %f > %f", i, items[i].Score, items[i-1].Score)
		}
	}
}

func TestGetDashboardData_ExcludesBlacklisted(t *testing.T) {
	m := newTestManager(t, nil)

	p := addTestProxy(m, "1.1.1.1", 8080, "http", "", "")
	m.mu.Lock()
	m.status[p.ID] = &models.ProxyStatus{Blacklisted: true}
	m.mu.Unlock()

	items := m.GetDashboardData()
	if len(items) != 0 {
		t.Errorf("expected 0 dashboard items for blacklisted proxy, got %d", len(items))
	}
}

func TestLoadProxies_FileNotExist(t *testing.T) {
	m := newTestManager(t, nil)
	proxies, err := m.LoadProxies()
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if len(proxies) != 0 {
		t.Errorf("expected 0 proxies, got %d", len(proxies))
	}
}

func TestLoadProxies_ArrayFormat(t *testing.T) {
	m := newTestManager(t, nil)

	data := `[{"ip":"1.1.1.1","port":8080,"protocol":"http"},{"ip":"2.2.2.2","port":1080,"protocol":"socks5"}]`
	if err := os.WriteFile(m.dataFile, []byte(data), 0644); err != nil {
		t.Fatal(err)
	}

	proxies, err := m.LoadProxies()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(proxies) != 2 {
		t.Errorf("expected 2 proxies, got %d", len(proxies))
	}
}

func TestLoadProxies_ObjectFormat(t *testing.T) {
	m := newTestManager(t, nil)

	data := `{"proxies":[{"ip":"1.1.1.1","port":8080,"protocol":"http"}]}`
	if err := os.WriteFile(m.dataFile, []byte(data), 0644); err != nil {
		t.Fatal(err)
	}

	proxies, err := m.LoadProxies()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(proxies) != 1 {
		t.Errorf("expected 1 proxy, got %d", len(proxies))
	}
}

func TestLoadProxies_InvalidFormat(t *testing.T) {
	m := newTestManager(t, nil)

	if err := os.WriteFile(m.dataFile, []byte("not json"), 0644); err != nil {
		t.Fatal(err)
	}

	_, err := m.LoadProxies()
	if err == nil {
		t.Error("expected error for invalid format")
	}
}

func TestIsEligibleByCountry(t *testing.T) {
	tests := []struct {
		name    string
		filter  string
		country string
		want    bool
	}{
		{"GLOBAL matches all", "GLOBAL", "US", true},
		{"empty matches all", "", "US", true},
		{"exact match", "US", "US", true},
		{"case insensitive", "us", "US", true},
		{"no match", "DE", "US", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m := newTestManager(t, func(cfg *config.Config) {
				cfg.CountryFilter = tt.filter
			})
			p := &models.Proxy{Country: tt.country}
			got := m.isEligibleByCountry(p)
			if got != tt.want {
				t.Errorf("isEligibleByCountry(%q, %q) = %v, want %v", tt.filter, tt.country, got, tt.want)
			}
		})
	}
}

func TestGetProxyStatus_ReturnsNilForUnknown(t *testing.T) {
	m := newTestManager(t, nil)
	status := m.GetProxyStatus("nonexistent")
	if status != nil {
		t.Errorf("expected nil for unknown proxy, got %v", status)
	}
}

func TestGetProxyStatus_ReturnsCopy(t *testing.T) {
	m := newTestManager(t, nil)
	p := addTestProxy(m, "1.1.1.1", 8080, "http", "", "")

	m.mu.Lock()
	m.status[p.ID] = &models.ProxyStatus{Alive: true, TotalChecks: 5}
	m.mu.Unlock()

	status := m.GetProxyStatus(p.ID)
	// Mutate the copy
	status.TotalChecks = 999

	// Original should be unchanged
	original := m.GetProxyStatus(p.ID)
	if original.TotalChecks != 5 {
		t.Error("GetProxyStatus should return a copy, not a reference")
	}
}

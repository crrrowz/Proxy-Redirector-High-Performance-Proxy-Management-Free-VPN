package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/crrrowz/proxy-redirector-v3/engine/internal/adblock"
	"github.com/crrrowz/proxy-redirector-v3/engine/internal/config"
	"github.com/crrrowz/proxy-redirector-v3/engine/internal/failover"
	"github.com/crrrowz/proxy-redirector-v3/engine/internal/proxy"
	"github.com/crrrowz/proxy-redirector-v3/shared/models"
)

// newTestREST creates a RESTServer with injected proxies and returns handler functions.
func newTestREST(t *testing.T) *RESTServer {
	t.Helper()
	tmpDir := t.TempDir()
	cfg := config.DefaultConfig()
	cfg.ProxiesFile = filepath.Join(tmpDir, "data.json")
	cfg.StatusFile = filepath.Join(tmpDir, "status.json")

	m := proxy.NewManager(cfg)

	now := time.Now()
	proxies := []*models.Proxy{
		{ID: "1.1.1.1_1080", IP: "1.1.1.1", Port: 1080, Type: models.ProxySOCKS5, Country: "US"},
		{ID: "2.2.2.2_8080", IP: "2.2.2.2", Port: 8080, Type: models.ProxyHTTP, Country: "DE"},
	}
	statuses := map[string]*models.ProxyStatus{
		"1.1.1.1_1080": {Alive: true, ResponseTimeMs: 100, Score: 85, TotalChecks: 10, TotalSuccesses: 9, LastAlive: now, LastChecked: now},
		"2.2.2.2_8080": {Alive: true, ResponseTimeMs: 200, Score: 60, TotalChecks: 8, TotalSuccesses: 6, LastAlive: now, LastChecked: now},
	}
	m.InjectTestData(proxies, statuses)

	fh := failover.NewHandler(m)
	_ = fh.Initialize()

	ab := adblock.NewEngine(filepath.Join(tmpDir, "blocklist.json"))

	return NewRESTServer(m, fh, ab, cfg)
}

// ---------------------------------------------------------------------------
// Status endpoint
// ---------------------------------------------------------------------------

func TestHandleStatus_GET(t *testing.T) {
	s := newTestREST(t)

	req := httptest.NewRequest(http.MethodGet, "/api/status", nil)
	w := httptest.NewRecorder()

	s.handleStatus(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	if ct := w.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("expected application/json, got %q", ct)
	}

	var body map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatalf("decode error: %v", err)
	}
	if _, ok := body["running"]; !ok {
		t.Error("expected 'running' key in response")
	}
}

func TestHandleStatus_MethodNotAllowed(t *testing.T) {
	s := newTestREST(t)

	req := httptest.NewRequest(http.MethodPost, "/api/status", nil)
	w := httptest.NewRecorder()

	s.handleStatus(w, req)
	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", w.Code)
	}
}

// ---------------------------------------------------------------------------
// Proxies endpoint
// ---------------------------------------------------------------------------

func TestHandleProxies_GET(t *testing.T) {
	s := newTestREST(t)

	req := httptest.NewRequest(http.MethodGet, "/api/proxies", nil)
	w := httptest.NewRecorder()

	s.handleProxies(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var body []interface{}
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatalf("decode error: %v", err)
	}
}

// ---------------------------------------------------------------------------
// Config endpoint
// ---------------------------------------------------------------------------

func TestHandleConfig_GET(t *testing.T) {
	s := newTestREST(t)

	req := httptest.NewRequest(http.MethodGet, "/api/config", nil)
	w := httptest.NewRecorder()

	s.handleConfig(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var body map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatalf("decode error: %v", err)
	}
	if _, ok := body["GRPC_PORT"]; !ok {
		t.Error("expected GRPC_PORT in config response")
	}
}

func TestHandleConfig_POST(t *testing.T) {
	s := newTestREST(t)

	bodyStr := `{"BATCH_SIZE": 100}`
	req := httptest.NewRequest(http.MethodPost, "/api/config", strings.NewReader(bodyStr))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	s.handleConfig(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestHandleConfig_InvalidMethod(t *testing.T) {
	s := newTestREST(t)

	req := httptest.NewRequest(http.MethodDelete, "/api/config", nil)
	w := httptest.NewRecorder()

	s.handleConfig(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", w.Code)
	}
}

// ---------------------------------------------------------------------------
// Countries endpoint
// ---------------------------------------------------------------------------

func TestHandleCountries_GET(t *testing.T) {
	s := newTestREST(t)

	req := httptest.NewRequest(http.MethodGet, "/api/countries", nil)
	w := httptest.NewRecorder()

	s.handleCountries(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

// ---------------------------------------------------------------------------
// Blocklist endpoint
// ---------------------------------------------------------------------------

func TestHandleBlocklist_GET(t *testing.T) {
	s := newTestREST(t)

	req := httptest.NewRequest(http.MethodGet, "/api/blocklist", nil)
	w := httptest.NewRecorder()

	s.handleBlocklist(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var body map[string]interface{}
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatalf("decode error: %v", err)
	}
	if _, ok := body["categories"]; !ok {
		t.Error("expected 'categories' in blocklist response")
	}
}

// ---------------------------------------------------------------------------
// ProxySelect endpoint
// ---------------------------------------------------------------------------

func TestHandleProxySelect_AutoMode(t *testing.T) {
	s := newTestREST(t)

	bodyStr := `{"id": "auto"}`
	req := httptest.NewRequest(http.MethodPost, "/api/proxy/select", strings.NewReader(bodyStr))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	s.handleProxySelect(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var body map[string]interface{}
	json.NewDecoder(w.Body).Decode(&body)
	if body["auto"] != true {
		t.Error("expected auto=true")
	}
}

func TestHandleProxySelect_ManualExisting(t *testing.T) {
	s := newTestREST(t)

	bodyStr := `{"id": "1.1.1.1_1080"}`
	req := httptest.NewRequest(http.MethodPost, "/api/proxy/select", strings.NewReader(bodyStr))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	s.handleProxySelect(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestHandleProxySelect_NotFound(t *testing.T) {
	s := newTestREST(t)

	bodyStr := `{"id": "nonexistent_9999"}`
	req := httptest.NewRequest(http.MethodPost, "/api/proxy/select", strings.NewReader(bodyStr))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	s.handleProxySelect(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestHandleProxySelect_MethodNotAllowed(t *testing.T) {
	s := newTestREST(t)

	req := httptest.NewRequest(http.MethodGet, "/api/proxy/select", nil)
	w := httptest.NewRecorder()

	s.handleProxySelect(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", w.Code)
	}
}

// ---------------------------------------------------------------------------
// ProxyAdd endpoint
// ---------------------------------------------------------------------------

func TestHandleProxyAdd(t *testing.T) {
	s := newTestREST(t)

	bodyStr := `{"ip":"5.5.5.5","port":3128,"type":"http"}`
	req := httptest.NewRequest(http.MethodPost, "/api/proxy/add", strings.NewReader(bodyStr))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	s.handleProxyAdd(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestHandleProxyAdd_MethodNotAllowed(t *testing.T) {
	s := newTestREST(t)

	req := httptest.NewRequest(http.MethodGet, "/api/proxy/add", nil)
	w := httptest.NewRecorder()

	s.handleProxyAdd(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("expected 405, got %d", w.Code)
	}
}

// ---------------------------------------------------------------------------
// BlocklistRules endpoint
// ---------------------------------------------------------------------------

func TestHandleBlocklistRules_Add(t *testing.T) {
	s := newTestREST(t)

	bodyStr := `{"action":"add","domain":"evil.com","category":"malware"}`
	req := httptest.NewRequest(http.MethodPost, "/api/blocklist/rules", strings.NewReader(bodyStr))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	s.handleBlocklistRules(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestHandleBlocklistRules_Remove(t *testing.T) {
	s := newTestREST(t)

	bodyStr := `{"action":"remove","domain":"doubleclick.net"}`
	req := httptest.NewRequest(http.MethodPost, "/api/blocklist/rules", strings.NewReader(bodyStr))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	s.handleBlocklistRules(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

// ---------------------------------------------------------------------------
// BlocklistToggle endpoint
// ---------------------------------------------------------------------------

func TestHandleBlocklistToggle(t *testing.T) {
	s := newTestREST(t)

	bodyStr := `{"category":"ads","enabled":false}`
	req := httptest.NewRequest(http.MethodPost, "/api/blocklist/toggle", strings.NewReader(bodyStr))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	s.handleBlocklistToggle(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

// ---------------------------------------------------------------------------
// jsonResponse helper
// ---------------------------------------------------------------------------

func TestJsonResponse(t *testing.T) {
	w := httptest.NewRecorder()
	jsonResponse(w, map[string]string{"key": "value"})

	if w.Header().Get("Content-Type") != "application/json" {
		t.Error("expected application/json Content-Type")
	}

	var body map[string]string
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatalf("decode error: %v", err)
	}
	if body["key"] != "value" {
		t.Errorf("expected key=value, got %q", body["key"])
	}
}

package server

import (
	"encoding/json"
	"net/http"
	"strconv"

	"github.com/crrrowz/proxy-redirector-v3/engine/internal/adblock"
	"github.com/crrrowz/proxy-redirector-v3/engine/internal/config"
	"github.com/crrrowz/proxy-redirector-v3/engine/internal/failover"
	"github.com/crrrowz/proxy-redirector-v3/engine/internal/proxy"
	"github.com/crrrowz/proxy-redirector-v3/engine/static"
	"github.com/crrrowz/proxy-redirector-v3/shared/models"
)

// RESTServer handles the HTTP API for the Admin Dashboard.
type RESTServer struct {
	manager  *proxy.Manager
	failover *failover.Handler
	adblock  *adblock.Engine
	config   *config.Config
	server   *http.Server
}

// NewRESTServer initializes a new REST API server.
func NewRESTServer(
	manager *proxy.Manager,
	failover *failover.Handler,
	adblock *adblock.Engine,
	cfg *config.Config,
) *RESTServer {
	return &RESTServer{
		manager:  manager,
		failover: failover,
		adblock:  adblock,
		config:   cfg,
	}
}

// Start begins listening on the configured port.
func (s *RESTServer) Start() error {
	mux := http.NewServeMux()

	// API Routes
	mux.HandleFunc("/api/status", s.handleStatus)
	mux.HandleFunc("/api/proxies", s.handleProxies)
	mux.HandleFunc("/api/config", s.handleConfig)
	mux.HandleFunc("/api/blocklist", s.handleBlocklist)
	mux.HandleFunc("/api/countries", s.handleCountries)

	// Admin Actions
	mux.HandleFunc("/api/start", s.handleStart)
	mux.HandleFunc("/api/stop", s.handleStop)
	mux.HandleFunc("/api/proxy/select", s.handleProxySelect)
	mux.HandleFunc("/api/proxy/add", s.handleProxyAdd)
	mux.HandleFunc("/api/blocklist/rules", s.handleBlocklistRules)
	mux.HandleFunc("/api/blocklist/toggle", s.handleBlocklistToggle)

	// Serve Static Files for Dashboard
	mux.Handle("/", http.FileServer(http.FS(static.FS)))

	// Auth middleware
	authMux := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if s.config.AuthEnabled {
			user, pass, ok := r.BasicAuth()
			if !ok || user != s.config.AuthUsername || pass != s.config.AuthPassword {
				w.Header().Set("WWW-Authenticate", `Basic realm="Restricted"`)
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}
		}
		mux.ServeHTTP(w, r)
	})

	// Allow CORS for local dev
	corsMux := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		
		authMux.ServeHTTP(w, r)
	})

	s.server = &http.Server{
		Addr:    ":" + strconv.Itoa(s.config.RESTPort),
		Handler: corsMux,
	}

	return s.server.ListenAndServe()
}

// Stop gracefully shuts down the server.
func (s *RESTServer) Stop() {
	if s.server != nil {
		s.server.Close()
	}
}

// -- Handlers --

func (s *RESTServer) handleStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	active := s.failover.CurrentProxy()
	poolSummary := s.manager.GetPoolSummary()
	adBlockStats := s.adblock.GetStats()

	resp := map[string]interface{}{
		"active_proxy": active,
		"pool":         poolSummary,
		"adblock":      adBlockStats,
		"running":      true,
		"mode":         "self-hosted",
	}

	jsonResponse(w, resp)
}

func (s *RESTServer) handleProxies(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	items := s.manager.GetDashboardData()
	jsonResponse(w, items)
}

func (s *RESTServer) handleConfig(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		jsonResponse(w, s.config.GetAll())
		return
	}

	if r.Method == http.MethodPost {
		var updates map[string]interface{}
		if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		
		s.config.Update(updates)
		_ = s.config.Save()
		jsonResponse(w, map[string]bool{"success": true})
		return
	}

	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

func (s *RESTServer) handleBlocklist(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	resp := map[string]interface{}{
		"categories": s.adblock.GetCategories(),
		"whitelist":  s.adblock.GetWhitelist(),
		"rules":      s.adblock.GetRules(),
		"stats":      s.adblock.GetStats(),
	}
	jsonResponse(w, resp)
}

func (s *RESTServer) handleCountries(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	jsonResponse(w, s.manager.GetAvailableCountries())
}

func (s *RESTServer) handleStart(w http.ResponseWriter, r *http.Request) {
	// Not fully implemented without main lifecycle hooks
	jsonResponse(w, map[string]bool{"success": true})
}

func (s *RESTServer) handleStop(w http.ResponseWriter, r *http.Request) {
	// Not fully implemented without main lifecycle hooks
	jsonResponse(w, map[string]bool{"success": true})
}

func (s *RESTServer) handleProxySelect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req map[string]string
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	id := req["id"]
	if id == "" || id == "auto" {
		s.failover.UnlockAuto()
		_ = s.failover.RefreshBest()
		jsonResponse(w, map[string]bool{"success": true, "auto": true})
		return
	}

	// Find the proxy by ID in the alive list (or all list)
	var target *models.Proxy
	for _, p := range s.manager.GetAllProxies() {
		if p.ID == id {
			target = p
			break
		}
	}

	if target == nil {
		http.Error(w, "Proxy not found", http.StatusNotFound)
		return
	}

	_ = s.failover.ForceSelect(target)
	jsonResponse(w, map[string]bool{"success": true, "auto": false})
}

func (s *RESTServer) handleProxyAdd(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		IP       string `json:"ip"`
		Port     int    `json:"port"`
		Type     string `json:"type"`
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	p := s.manager.AddCustomProxy(req.IP, req.Port, req.Type, req.Username, req.Password)
	jsonResponse(w, p)
}

func (s *RESTServer) handleBlocklistRules(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Action   string `json:"action"` // "add", "remove"
		Domain   string `json:"domain"`
		Category string `json:"category"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if req.Action == "add" {
		s.adblock.AddRule(req.Domain, req.Category)
	} else if req.Action == "remove" {
		s.adblock.RemoveRule(req.Domain)
	}

	jsonResponse(w, map[string]bool{"success": true})
}

func (s *RESTServer) handleBlocklistToggle(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Category string `json:"category"`
		Enabled  bool   `json:"enabled"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	s.adblock.ToggleCategory(req.Category, req.Enabled)
	jsonResponse(w, map[string]bool{"success": true})
}

// Helpers

func jsonResponse(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

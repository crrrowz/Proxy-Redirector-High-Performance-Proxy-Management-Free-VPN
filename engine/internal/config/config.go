package config

import (
	"encoding/json"
	"fmt"
	"os"
	"sync"
)

// Config holds all the configuration for the Engine.
type Config struct {
	// Pool
	MinAlivePool       int `json:"MIN_ALIVE_POOL"`
	BatchSize          int `json:"BATCH_SIZE"`
	RecheckIntervalSec int `json:"RECHECK_INTERVAL_SECONDS"`

	// Check
	CheckTimeoutSec     int    `json:"CHECK_TIMEOUT_SECONDS"`
	MaxConcurrentChecks int    `json:"MAX_CONCURRENT_CHECKS"`
	CheckURL            string `json:"CHECK_URL"`
	AnonymityCheck      bool   `json:"ANONYMITY_CHECK"`
	MaxSpeedMs          int    `json:"MAX_SPEED_MS"`
	SSLCheckEnabled     bool   `json:"SSL_CHECK_ENABLED"`
	HTTPSCheckURL       string `json:"HTTPS_CHECK_URL"`

	// Retry
	DeadRetryAfterSec   int `json:"DEAD_RETRY_AFTER_SECONDS"`
	MaxConsecFailures   int `json:"MAX_CONSECUTIVE_FAILURES"`
	BlacklistAfterFails int `json:"BLACKLIST_AFTER_FAILURES"`

	// Server
	GRPCPort int `json:"GRPC_PORT"`
	RESTPort int `json:"REST_PORT"`

	// Auth
	AuthEnabled   bool     `json:"AUTH_ENABLED"`
	AuthUsername  string   `json:"AUTH_USERNAME"`
	AuthPassword  string   `json:"AUTH_PASSWORD"`
	APIKey        string   `json:"API_KEY"`
	AuthWhitelist []string `json:"AUTH_WHITELIST"`

	// Scoring
	ScoreAlive          float64 `json:"SCORE_ALIVE"`
	ScoreSpeedMax       float64 `json:"SCORE_SPEED_MAX"`
	ScoreRecencyMax     float64 `json:"SCORE_RECENCY_MAX"`
	ScoreFailurePenalty float64 `json:"SCORE_FAILURE_PENALTY"`
	ScoreSuccessRateMax float64 `json:"SCORE_SUCCESS_RATE_MAX"`
	ScoreSSLBonus       float64 `json:"SCORE_SSL_BONUS"`

	// Country
	CountryFilter string `json:"COUNTRY_FILTER"`

	// AdBlock
	AdBlockEnabled bool `json:"ADBLOCK_ENABLED"`

	// Discovery
	DiscoveryBatchSize int `json:"DISCOVERY_BATCH_SIZE"`
	DiscoveryDelaySec  int `json:"DISCOVERY_DELAY_SECONDS"`

	// Fetch
	FetchEnabled     bool `json:"FETCH_ENABLED"`
	FetchIntervalSec int  `json:"FETCH_INTERVAL_SECONDS"`

	// Files
	ProxiesFile   string `json:"PROXIES_FILE"`
	StatusFile    string `json:"STATUS_FILE"`
	BlocklistFile string `json:"BLOCKLIST_FILE"`
	AnalyticsFile string `json:"ANALYTICS_FILE"`

	// Rotation
	RotationEnabled       bool     `json:"ROTATION_ENABLED"`
	RotationIntervalSec   int      `json:"ROTATION_INTERVAL_SEC"`
	RotationProxyTypes    []string `json:"ROTATION_PROXY_TYPES"`
	RotationCountryFilter string   `json:"ROTATION_COUNTRY"`
	RotationMaxSpeedMs    int      `json:"ROTATION_MAX_SPEED_MS"`
	RotationPoolSize      int      `json:"ROTATION_POOL_SIZE"`
	RotationSSLOnly       bool     `json:"ROTATION_SSL_ONLY"`

	// Runtime
	RealIP string `json:"-"`
	Mode   string `json:"-"` // "self-hosted" or "saas"

	filePath string       `json:"-"`
	mu       sync.RWMutex `json:"-"`
}

// DefaultConfig returns a Config struct with default values.
func DefaultConfig() *Config {
	return &Config{
		MinAlivePool:        3,
		BatchSize:           50,
		RecheckIntervalSec:  60,
		CheckTimeoutSec:     8,
		MaxConcurrentChecks: 50,
		CheckURL:            "http://httpbin.org/ip",
		HTTPSCheckURL:       "https://httpbin.org/ip",
		AnonymityCheck:      true,
		MaxSpeedMs:          0,
		SSLCheckEnabled:     true,
		DeadRetryAfterSec:   300,
		MaxConsecFailures:   5,
		BlacklistAfterFails: 15,
		GRPCPort:            50051,
		RESTPort:            9090,
		AuthEnabled:         false,
		ScoreAlive:          50,
		ScoreSpeedMax:       25,
		ScoreRecencyMax:     15,
		ScoreFailurePenalty: 5,
		ScoreSuccessRateMax: 10,
		ScoreSSLBonus:       30,
		CountryFilter:       "GLOBAL",
		AdBlockEnabled:      true,
		DiscoveryBatchSize:  150,
		DiscoveryDelaySec:   1,
		FetchEnabled:        true,
		FetchIntervalSec:    120,
		ProxiesFile:         "data/data.json",
		StatusFile:          "data/proxy_status.json",
		BlocklistFile:       "data/blocklist.json",
		AnalyticsFile:       "data/analytics.json",
		RotationEnabled:       false,
		RotationIntervalSec:   30,
		RotationProxyTypes:    []string{"all"},
		RotationCountryFilter: "GLOBAL",
		RotationMaxSpeedMs:    0,
		RotationPoolSize:      0,
		RotationSSLOnly:       false,
		Mode:                "self-hosted",
	}
}

// LoadConfig loads the configuration from a JSON file.
// If the file doesn't exist, it returns the default configuration.
func LoadConfig(path string) (*Config, error) {
	cfg := DefaultConfig()
	cfg.filePath = path

	if path == "" {
		return cfg, nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			// Save default config if file doesn't exist
			err = cfg.Save()
			return cfg, err
		}
		return cfg, fmt.Errorf("failed to read config file: %w", err)
	}

	if err := json.Unmarshal(data, cfg); err != nil {
		return cfg, fmt.Errorf("failed to parse config file: %w", err)
	}

	return cfg, nil
}

// Save saves the current configuration to the JSON file.
func (c *Config) Save() error {
	c.mu.RLock()
	defer c.mu.RUnlock()

	if c.filePath == "" {
		return nil
	}

	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return fmt.Errorf("failed to marshal config: %w", err)
	}

	if err := os.WriteFile(c.filePath, data, 0644); err != nil {
		return fmt.Errorf("failed to write config file: %w", err)
	}

	return nil
}

// Update updates specific configuration keys and saves the file.
func (c *Config) Update(updates map[string]interface{}) error {
	c.mu.Lock()
	
	// Quick hack to update struct fields via JSON roundtrip
	// 1. Marshal current struct to map
	currentData, _ := json.Marshal(c)
	var currentMap map[string]interface{}
	json.Unmarshal(currentData, &currentMap)

	// 2. Apply updates
	for k, v := range updates {
		currentMap[k] = v
	}

	// 3. Marshal map back to struct
	updatedData, _ := json.Marshal(currentMap)
	json.Unmarshal(updatedData, c)
	
	c.mu.Unlock()

	return c.Save()
}

// GetAll returns a map representation of the current configuration.
func (c *Config) GetAll() map[string]interface{} {
	c.mu.RLock()
	defer c.mu.RUnlock()

	data, _ := json.Marshal(c)
	var m map[string]interface{}
	json.Unmarshal(data, &m)
	return m
}

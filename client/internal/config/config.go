package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
)

type Config struct {
	EngineAddress string `json:"engine_address"`
	SOCKS5Port    int    `json:"socks5_port"`
	HTTPPort      int    `json:"http_port"`
	AuthUsername   string `json:"auth_username"`
	AuthPassword   string `json:"auth_password"`

	// internal — path to the settings file
	mu       sync.RWMutex
	filePath string
}

// configDir returns %APPDATA%\ProxyRedirector, creating it if needed.
func configDir() string {
	appData := os.Getenv("APPDATA")
	if appData == "" {
		appData = "."
	}
	dir := filepath.Join(appData, "ProxyRedirector")
	os.MkdirAll(dir, 0755)
	return dir
}

// LoadConfig reads settings from %APPDATA%\ProxyRedirector\settings.json.
// Falls back to defaults if the file doesn't exist yet.
func LoadConfig() *Config {
	cfg := &Config{
		EngineAddress: "127.0.0.1:50051",
		SOCKS5Port:    1080,
		HTTPPort:      8080,
		AuthUsername:   "",
		AuthPassword:   "",
	}

	cfg.filePath = filepath.Join(configDir(), "settings.json")

	data, err := os.ReadFile(cfg.filePath)
	if err != nil {
		// First run — save defaults
		_ = cfg.Save()
		return cfg
	}

	if err := json.Unmarshal(data, cfg); err != nil {
		// Corrupt file — use defaults
		return cfg
	}

	return cfg
}

// Save persists the current configuration to disk.
func (c *Config) Save() error {
	c.mu.RLock()
	defer c.mu.RUnlock()

	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(c.filePath, data, 0644)
}

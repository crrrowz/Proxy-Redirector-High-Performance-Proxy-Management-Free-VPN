package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDefaultConfig_Values(t *testing.T) {
	cfg := DefaultConfig()

	tests := []struct {
		name string
		got  interface{}
		want interface{}
	}{
		{"MinAlivePool", cfg.MinAlivePool, 3},
		{"BatchSize", cfg.BatchSize, 50},
		{"RecheckIntervalSec", cfg.RecheckIntervalSec, 60},
		{"CheckTimeoutSec", cfg.CheckTimeoutSec, 8},
		{"MaxConcurrentChecks", cfg.MaxConcurrentChecks, 50},
		{"CheckURL", cfg.CheckURL, "http://httpbin.org/ip"},
		{"GRPCPort", cfg.GRPCPort, 50051},
		{"RESTPort", cfg.RESTPort, 9090},
		{"CountryFilter", cfg.CountryFilter, "GLOBAL"},
		{"Mode", cfg.Mode, "self-hosted"},
		{"ScoreAlive", cfg.ScoreAlive, 50.0},
		{"ScoreSSLBonus", cfg.ScoreSSLBonus, 30.0},
		{"FetchEnabled", cfg.FetchEnabled, true},
		{"AdBlockEnabled", cfg.AdBlockEnabled, true},
		{"BlacklistAfterFails", cfg.BlacklistAfterFails, 15},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.got != tt.want {
				t.Errorf("%s = %v, want %v", tt.name, tt.got, tt.want)
			}
		})
	}
}

func TestLoadConfig_EmptyPath(t *testing.T) {
	cfg, err := LoadConfig("")
	if err != nil {
		t.Fatalf("LoadConfig('') error: %v", err)
	}
	if cfg.GRPCPort != 50051 {
		t.Errorf("expected default GRPCPort 50051, got %d", cfg.GRPCPort)
	}
}

func TestLoadConfig_NonExistentCreatesDefault(t *testing.T) {
	tmpDir := t.TempDir()
	fp := filepath.Join(tmpDir, "engine_config.json")

	cfg, err := LoadConfig(fp)
	if err != nil {
		t.Fatalf("LoadConfig error: %v", err)
	}
	if cfg.BatchSize != 50 {
		t.Errorf("expected default BatchSize 50, got %d", cfg.BatchSize)
	}

	// File should have been created
	if _, err := os.Stat(fp); err != nil {
		t.Errorf("expected config file to be created: %v", err)
	}
}

func TestLoadConfig_SaveAndReload(t *testing.T) {
	tmpDir := t.TempDir()
	fp := filepath.Join(tmpDir, "engine_config.json")

	cfg, _ := LoadConfig(fp)
	cfg.GRPCPort = 55555
	if err := cfg.Save(); err != nil {
		t.Fatalf("Save error: %v", err)
	}

	cfg2, err := LoadConfig(fp)
	if err != nil {
		t.Fatalf("Reload error: %v", err)
	}
	if cfg2.GRPCPort != 55555 {
		t.Errorf("expected reloaded GRPCPort 55555, got %d", cfg2.GRPCPort)
	}
}

func TestLoadConfig_InvalidJSON(t *testing.T) {
	tmpDir := t.TempDir()
	fp := filepath.Join(tmpDir, "bad_config.json")
	_ = os.WriteFile(fp, []byte("{invalid json"), 0644)

	cfg, err := LoadConfig(fp)
	if err == nil {
		t.Fatal("expected error for invalid JSON")
	}
	// Should still return default config
	if cfg == nil {
		t.Fatal("expected non-nil config even on error")
	}
}

func TestUpdate_ChangesAndSaves(t *testing.T) {
	tmpDir := t.TempDir()
	fp := filepath.Join(tmpDir, "engine_config.json")

	cfg, _ := LoadConfig(fp)

	err := cfg.Update(map[string]interface{}{
		"GRPC_PORT":  float64(12345),
		"BATCH_SIZE": float64(100),
	})
	if err != nil {
		t.Fatalf("Update error: %v", err)
	}

	if cfg.GRPCPort != 12345 {
		t.Errorf("expected GRPCPort 12345 after update, got %d", cfg.GRPCPort)
	}
	if cfg.BatchSize != 100 {
		t.Errorf("expected BatchSize 100 after update, got %d", cfg.BatchSize)
	}

	// Reload to verify persistence
	cfg2, _ := LoadConfig(fp)
	if cfg2.GRPCPort != 12345 {
		t.Errorf("expected persisted GRPCPort 12345, got %d", cfg2.GRPCPort)
	}
}

func TestGetAll_ReturnsMap(t *testing.T) {
	cfg := DefaultConfig()
	m := cfg.GetAll()

	if m == nil {
		t.Fatal("GetAll returned nil")
	}
	if _, ok := m["GRPC_PORT"]; !ok {
		t.Error("expected GRPC_PORT key in GetAll map")
	}
	if _, ok := m["BATCH_SIZE"]; !ok {
		t.Error("expected BATCH_SIZE key in GetAll map")
	}
}

func TestSave_EmptyPath(t *testing.T) {
	cfg := DefaultConfig()
	// No filePath set — Save should be a no-op
	if err := cfg.Save(); err != nil {
		t.Errorf("Save with empty path should not error, got: %v", err)
	}
}

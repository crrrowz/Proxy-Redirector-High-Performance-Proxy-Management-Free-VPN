package database

import (
	"log/slog"
	"os"
	"path/filepath"
	"testing"
)

func TestLegacyImporter(t *testing.T) {
	tempDir := t.TempDir()
	dbPath := filepath.Join(tempDir, "test_import.db")
	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))

	db, err := NewSQLiteDB(dbPath, logger)
	if err != nil {
		t.Fatalf("failed to create sqlite db: %v", err)
	}
	defer db.Close()

	// Create dummy legacy data.json
	sampleJSON := `[
		{
			"ip": "103.152.112.186",
			"port": 8080,
			"type": "socks5",
			"geolocation": {
				"country": "US",
				"city": "New York"
			}
		},
		{
			"ip": "185.199.229.156",
			"port": 1080,
			"protocol": "http",
			"geolocation": {
				"country": "DE",
				"city": "Frankfurt"
			}
		}
	]`
	jsonPath := filepath.Join(tempDir, "data.json")
	if err := os.WriteFile(jsonPath, []byte(sampleJSON), 0644); err != nil {
		t.Fatalf("failed to write dummy json: %v", err)
	}

	importer := NewImporter(db)
	count, err := importer.ImportLegacyDataDirectory(tempDir)
	if err != nil {
		t.Fatalf("importer returned error: %v", err)
	}

	if count != 2 {
		t.Fatalf("expected 2 imported proxies, got %d", count)
	}

	// Verify proxies exist in DB
	records, err := db.GetProxies(ProxyFilters{})
	if err != nil {
		t.Fatalf("failed to load proxies from db: %v", err)
	}

	if len(records) != 2 {
		t.Fatalf("expected 2 proxies in db, got %d", len(records))
	}

	total, _, _, err := db.GetProxyCount()
	if err != nil {
		t.Fatalf("failed to get proxy count: %v", err)
	}
	if total != 2 {
		t.Fatalf("expected total count 2, got %d", total)
	}
}

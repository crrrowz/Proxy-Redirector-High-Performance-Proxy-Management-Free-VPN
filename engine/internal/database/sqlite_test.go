package database

import (
	"log/slog"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/crrrowz/proxy-redirector-v3/shared/models"
)

func newTestDB(t *testing.T) *SQLiteDB {
	t.Helper()
	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelWarn}))
	db, err := NewSQLiteDB(":memory:", logger)
	if err != nil {
		t.Fatalf("NewSQLiteDB(:memory:) error: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return db
}

// ---------------------------------------------------------------------------
// Schema / WAL
// ---------------------------------------------------------------------------

func TestNewSQLiteDB_MigratesSchema(t *testing.T) {
	db := newTestDB(t)

	// Tables should exist
	var name string
	err := db.db.QueryRow("SELECT name FROM sqlite_master WHERE type='table' AND name='proxies'").Scan(&name)
	if err != nil {
		t.Fatalf("proxies table not found: %v", err)
	}
	err = db.db.QueryRow("SELECT name FROM sqlite_master WHERE type='table' AND name='analytics'").Scan(&name)
	if err != nil {
		t.Fatalf("analytics table not found: %v", err)
	}
	err = db.db.QueryRow("SELECT name FROM sqlite_master WHERE type='table' AND name='config'").Scan(&name)
	if err != nil {
		t.Fatalf("config table not found: %v", err)
	}
	err = db.db.QueryRow("SELECT name FROM sqlite_master WHERE type='table' AND name='api_keys'").Scan(&name)
	if err != nil {
		t.Fatalf("api_keys table not found: %v", err)
	}
}

func TestAPIKeysManagement(t *testing.T) {
	db := newTestDB(t)

	// Ensure default master key
	master, created, err := db.EnsureDefaultAPIKey()
	if err != nil {
		t.Fatalf("EnsureDefaultAPIKey failed: %v", err)
	}
	if !created {
		t.Fatalf("expected created to be true for empty db")
	}
	if master.Role != "admin" {
		t.Fatalf("expected admin role, got %s", master.Role)
	}

	// Validate valid key
	rec, err := db.ValidateAPIKey(master.Key)
	if err != nil {
		t.Fatalf("ValidateAPIKey failed: %v", err)
	}
	if rec.ID != master.ID {
		t.Fatalf("expected ID %s, got %s", master.ID, rec.ID)
	}

	// Create a client key
	clientKey, err := db.CreateAPIKey("Mobile Client", "client")
	if err != nil {
		t.Fatalf("CreateAPIKey failed: %v", err)
	}
	if clientKey.Role != "client" {
		t.Fatalf("expected role client, got %s", clientKey.Role)
	}

	// List keys
	keys, err := db.ListAPIKeys()
	if err != nil {
		t.Fatalf("ListAPIKeys failed: %v", err)
	}
	if len(keys) != 2 {
		t.Fatalf("expected 2 keys, got %d", len(keys))
	}

	// Revoke client key
	err = db.RevokeAPIKey(clientKey.ID)
	if err != nil {
		t.Fatalf("RevokeAPIKey failed: %v", err)
	}

	// Validate revoked key should fail
	_, err = db.ValidateAPIKey(clientKey.Key)
	if err == nil {
		t.Fatalf("expected validation of revoked key to fail")
	}
}

func TestWALMode(t *testing.T) {
	// Use a temp file so WAL mode pragma sticks
	tmpDir := t.TempDir()
	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelWarn}))
	db, err := NewSQLiteDB(tmpDir+"/test.db", logger)
	if err != nil {
		t.Fatalf("NewSQLiteDB error: %v", err)
	}
	defer db.Close()

	var mode string
	err = db.db.QueryRow("PRAGMA journal_mode").Scan(&mode)
	if err != nil {
		t.Fatalf("PRAGMA journal_mode error: %v", err)
	}
	if mode != "wal" {
		t.Errorf("expected WAL mode, got %q", mode)
	}
}

// ---------------------------------------------------------------------------
// Proxies CRUD
// ---------------------------------------------------------------------------

func TestSaveAndGetProxies(t *testing.T) {
	db := newTestDB(t)

	proxies := []*models.Proxy{
		{IP: "1.1.1.1", Port: 1080, Type: models.ProxySOCKS5, Country: "US"},
		{IP: "2.2.2.2", Port: 8080, Type: models.ProxyHTTP, Country: "DE"},
	}
	for _, p := range proxies {
		p.ID = p.GenerateID()
	}

	now := time.Now()
	statuses := map[string]*models.ProxyStatus{
		proxies[0].ID: {Alive: true, ResponseTimeMs: 100, Score: 85, TotalChecks: 10, TotalSuccesses: 9, LastChecked: now, LastAlive: now},
		proxies[1].ID: {Alive: false, ResponseTimeMs: 500, Score: 20, TotalChecks: 5, TotalSuccesses: 1, LastChecked: now},
	}

	if err := db.SaveProxies(proxies, statuses); err != nil {
		t.Fatalf("SaveProxies error: %v", err)
	}

	// Get all
	records, err := db.GetProxies(ProxyFilters{})
	if err != nil {
		t.Fatalf("GetProxies error: %v", err)
	}
	if len(records) != 2 {
		t.Fatalf("expected 2 records, got %d", len(records))
	}

	// Should be sorted by score DESC
	if records[0].Score < records[1].Score {
		t.Error("expected results sorted by score DESC")
	}
}

func TestGetProxies_AliveOnly(t *testing.T) {
	db := newTestDB(t)
	seedProxies(t, db)

	records, err := db.GetProxies(ProxyFilters{AliveOnly: true})
	if err != nil {
		t.Fatalf("GetProxies error: %v", err)
	}
	for _, r := range records {
		if !r.Alive {
			t.Errorf("got dead proxy %s with AliveOnly filter", r.ID)
		}
	}
}

func TestGetProxies_CountryFilter(t *testing.T) {
	db := newTestDB(t)
	seedProxies(t, db)

	records, err := db.GetProxies(ProxyFilters{Country: "US"})
	if err != nil {
		t.Fatalf("GetProxies error: %v", err)
	}
	for _, r := range records {
		if r.Country != "US" {
			t.Errorf("got country %s with US filter", r.Country)
		}
	}
}

func TestGetProxies_Limit(t *testing.T) {
	db := newTestDB(t)
	seedProxies(t, db)

	records, err := db.GetProxies(ProxyFilters{Limit: 1})
	if err != nil {
		t.Fatalf("GetProxies error: %v", err)
	}
	if len(records) > 1 {
		t.Errorf("expected max 1 record, got %d", len(records))
	}
}

func TestUpdateProxyStatus(t *testing.T) {
	db := newTestDB(t)
	seedProxies(t, db)

	now := time.Now()
	newStatus := &models.ProxyStatus{
		Alive:          false,
		ResponseTimeMs: 999,
		Score:          5,
		LastChecked:    now,
	}

	if err := db.UpdateProxyStatus("1.1.1.1_1080", newStatus); err != nil {
		t.Fatalf("UpdateProxyStatus error: %v", err)
	}

	records, _ := db.GetProxies(ProxyFilters{})
	for _, r := range records {
		if r.ID == "1.1.1.1_1080" {
			if r.Alive {
				t.Error("expected alive=false after update")
			}
			if r.SpeedMs != 999 {
				t.Errorf("expected speed 999, got %f", r.SpeedMs)
			}
		}
	}
}

func TestGetProxyCount(t *testing.T) {
	db := newTestDB(t)
	seedProxies(t, db)

	total, alive, dead, err := db.GetProxyCount()
	if err != nil {
		t.Fatalf("GetProxyCount error: %v", err)
	}
	if total != 3 {
		t.Errorf("expected total=3, got %d", total)
	}
	if alive < 1 {
		t.Errorf("expected at least 1 alive, got %d", alive)
	}
	if dead < 0 {
		t.Errorf("dead count negative: %d", dead)
	}
	if alive+dead != total {
		t.Errorf("alive(%d) + dead(%d) != total(%d)", alive, dead, total)
	}
}

// ---------------------------------------------------------------------------
// Analytics CRUD
// ---------------------------------------------------------------------------

func TestSaveAndGetAnalytics(t *testing.T) {
	db := newTestDB(t)
	seedProxies(t, db) // Need proxy record for FK

	rec := &AnalyticsRecord{
		ProxyID:          "1.1.1.1_1080",
		AvgSpeedMs:       150,
		MinSpeedMs:       80,
		MaxSpeedMs:       300,
		UptimePct:        95.5,
		ReliabilityScore: 88,
		Tags:             `["fast","reliable"]`,
		TotalChecks:      100,
		TotalSuccesses:   95,
	}

	if err := db.SaveAnalytics(rec); err != nil {
		t.Fatalf("SaveAnalytics error: %v", err)
	}

	got, err := db.GetAnalytics("1.1.1.1_1080")
	if err != nil {
		t.Fatalf("GetAnalytics error: %v", err)
	}
	if got.AvgSpeedMs != 150 {
		t.Errorf("expected AvgSpeedMs 150, got %f", got.AvgSpeedMs)
	}
	if got.ReliabilityScore != 88 {
		t.Errorf("expected ReliabilityScore 88, got %f", got.ReliabilityScore)
	}
}

func TestGetTopProxies(t *testing.T) {
	db := newTestDB(t)
	seedProxies(t, db)

	for i, id := range []string{"1.1.1.1_1080", "2.2.2.2_8080"} {
		_ = db.SaveAnalytics(&AnalyticsRecord{
			ProxyID:          id,
			ReliabilityScore: float64((i + 1) * 50),
		})
	}

	top, err := db.GetTopProxies(10)
	if err != nil {
		t.Fatalf("GetTopProxies error: %v", err)
	}
	if len(top) < 2 {
		t.Fatalf("expected at least 2 records, got %d", len(top))
	}
	// Should be sorted by reliability DESC
	if top[0].ReliabilityScore < top[1].ReliabilityScore {
		t.Error("expected results sorted by reliability DESC")
	}
}

// ---------------------------------------------------------------------------
// Config key-value
// ---------------------------------------------------------------------------

func TestConfigKeyValue(t *testing.T) {
	db := newTestDB(t)

	if err := db.SetConfigValue("mode", "self-hosted"); err != nil {
		t.Fatalf("SetConfigValue error: %v", err)
	}

	val, err := db.GetConfigValue("mode")
	if err != nil {
		t.Fatalf("GetConfigValue error: %v", err)
	}
	if val != "self-hosted" {
		t.Errorf("expected 'self-hosted', got %q", val)
	}

	// Update existing
	_ = db.SetConfigValue("mode", "saas")
	val, _ = db.GetConfigValue("mode")
	if val != "saas" {
		t.Errorf("expected 'saas' after upsert, got %q", val)
	}
}

func TestGetAllConfig(t *testing.T) {
	db := newTestDB(t)

	_ = db.SetConfigValue("key1", "val1")
	_ = db.SetConfigValue("key2", "val2")

	all, err := db.GetAllConfig()
	if err != nil {
		t.Fatalf("GetAllConfig error: %v", err)
	}
	if len(all) != 2 {
		t.Errorf("expected 2 config entries, got %d", len(all))
	}
	if all["key1"] != "val1" {
		t.Errorf("expected key1=val1, got %q", all["key1"])
	}
}

// ---------------------------------------------------------------------------
// Concurrent read/write
// ---------------------------------------------------------------------------

func TestConcurrentReadWrite(t *testing.T) {
	db := newTestDB(t)
	seedProxies(t, db)

	var wg sync.WaitGroup
	errCh := make(chan error, 20)

	// Concurrent writes
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			err := db.SetConfigValue("counter", string(rune('A'+i)))
			if err != nil {
				errCh <- err
			}
		}(i)
	}

	// Concurrent reads
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := db.GetProxies(ProxyFilters{})
			if err != nil {
				errCh <- err
			}
		}()
	}

	wg.Wait()
	close(errCh)

	for err := range errCh {
		t.Errorf("concurrent operation error: %v", err)
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func seedProxies(t *testing.T, db *SQLiteDB) {
	t.Helper()
	proxies := []*models.Proxy{
		{IP: "1.1.1.1", Port: 1080, Type: models.ProxySOCKS5, Country: "US"},
		{IP: "2.2.2.2", Port: 8080, Type: models.ProxyHTTP, Country: "DE"},
		{IP: "3.3.3.3", Port: 3128, Type: models.ProxyHTTP, Country: "US"},
	}
	for _, p := range proxies {
		p.ID = p.GenerateID()
	}

	now := time.Now()
	statuses := map[string]*models.ProxyStatus{
		"1.1.1.1_1080": {Alive: true, ResponseTimeMs: 100, Score: 85, TotalChecks: 10, TotalSuccesses: 9, LastChecked: now, LastAlive: now},
		"2.2.2.2_8080": {Alive: true, ResponseTimeMs: 200, Score: 60, TotalChecks: 8, TotalSuccesses: 6, LastChecked: now, LastAlive: now},
		"3.3.3.3_3128": {Alive: false, ResponseTimeMs: 0, Score: 0, TotalChecks: 5, TotalSuccesses: 0, LastChecked: now},
	}

	if err := db.SaveProxies(proxies, statuses); err != nil {
		t.Fatalf("seedProxies: %v", err)
	}
}

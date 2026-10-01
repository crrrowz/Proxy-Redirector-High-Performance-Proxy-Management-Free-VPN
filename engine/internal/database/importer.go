package database

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/crrrowz/proxy-redirector-v3/shared/models"
)

// LegacyBlocklistFile matches the legacy Python blocklist.json format
type LegacyBlocklistFile struct {
	Enabled           bool              `json:"enabled"`
	CategoriesEnabled map[string]bool   `json:"categories_enabled"`
	ExactDomains      map[string]string `json:"exact_domains"`
	WildcardPatterns  []string          `json:"wildcard_patterns"`
	Whitelist         []string          `json:"whitelist"`
}

// LegacyAnalyticsEntry matches legacy analytics.json entries
type LegacyAnalyticsEntry struct {
	TotalChecks      int      `json:"total_checks"`
	TotalSuccesses   int      `json:"total_successes"`
	TotalFailures    int      `json:"total_failures"`
	AvgSpeedMs       float64  `json:"avg_speed_ms"`
	ReliabilityScore float64  `json:"reliability_score"`
	Country          string   `json:"country"`
	Tags             []string `json:"tags"`
}

// Importer handles importing legacy JSON data into SQLite.
type Importer struct {
	db DB
}

// NewImporter creates a new Importer instance.
func NewImporter(db DB) *Importer {
	return &Importer{db: db}
}

// ImportLegacyDataDirectory imports proxies, statuses, and blocklist from a directory containing JSON files.
func (imp *Importer) ImportLegacyDataDirectory(dataDir string) (int, error) {
	importedCount := 0

	// 1. Import Proxies (data.json)
	dataPath := filepath.Join(dataDir, "data.json")
	if _, err := os.Stat(dataPath); err == nil {
		count, err := imp.ImportProxiesJSON(dataPath)
		if err != nil {
			return importedCount, fmt.Errorf("failed importing data.json: %w", err)
		}
		importedCount += count
	}

	return importedCount, nil
}

// ImportProxiesJSON parses legacy data.json and persists into the DB.
func (imp *Importer) ImportProxiesJSON(filePath string) (int, error) {
	bytes, err := os.ReadFile(filePath)
	if err != nil {
		return 0, err
	}

	var rawEntries []models.ProxyEntry
	// Try parsing as array of ProxyEntry
	if err := json.Unmarshal(bytes, &rawEntries); err != nil {
		// Try parsing as ProxyDataFile object
		var dataFile models.ProxyDataFile
		if err2 := json.Unmarshal(bytes, &dataFile); err2 != nil {
			return 0, fmt.Errorf("could not parse json format: %w", err)
		}
		rawEntries = dataFile.Proxies
	}

	var proxies []*models.Proxy
	statuses := make(map[string]*models.ProxyStatus)

	for _, entry := range rawEntries {
		if entry.IP == "" || entry.Port == 0 {
			continue
		}

		proto := strings.ToLower(entry.Protocol)
		if proto == "" {
			proto = strings.ToLower(entry.Type)
		}
		if proto == "" {
			proto = "socks5"
		}

		var country, city string
		if entry.Geolocation != nil {
			country = entry.Geolocation.Country
			city = entry.Geolocation.City
		}

		var user, pass string
		if entry.Username != nil {
			user = *entry.Username
		}
		if entry.Password != nil {
			pass = *entry.Password
		}

		p := &models.Proxy{
			IP:       entry.IP,
			Port:     entry.Port,
			Type:     models.ProxyType(proto),
			Username: user,
			Password: pass,
			Country:  country,
			City:     city,
		}
		p.ID = p.GenerateID()

		proxies = append(proxies, p)
		statuses[p.ID] = &models.ProxyStatus{
			Alive:       false,
			TotalChecks: 0,
			Score:       0,
		}
	}

	if len(proxies) > 0 {
		if err := imp.db.SaveProxies(proxies, statuses); err != nil {
			return 0, err
		}
	}

	return len(proxies), nil
}

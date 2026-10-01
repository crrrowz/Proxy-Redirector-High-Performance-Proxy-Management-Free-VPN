package proxy

import (
	"encoding/json"
	"fmt"
	"os"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/crrrowz/proxy-redirector-v3/engine/internal/config"
	"github.com/crrrowz/proxy-redirector-v3/shared/models"
)

// CountryInfo holds data about proxies available per country.
type CountryInfo struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

// Manager handles the proxy pool lifecycle, scoring, and status.
type Manager struct {
	proxies    []*models.Proxy
	status     map[string]*models.ProxyStatus
	byID       map[string]*models.Proxy
	mu         sync.RWMutex
	config     *config.Config
	dataFile   string
	statusFile string
	analytics  *AnalyticsEngine
	rotator    *Rotator
}

// NewManager creates a new proxy manager.
func NewManager(cfg *config.Config) *Manager {
	m := &Manager{
		proxies:    make([]*models.Proxy, 0),
		status:     make(map[string]*models.ProxyStatus),
		byID:       make(map[string]*models.Proxy),
		config:     cfg,
		dataFile:   cfg.ProxiesFile,
		statusFile: cfg.StatusFile,
		analytics:  NewAnalyticsEngine(),
	}
	m.rotator = NewRotator(cfg, m)
	if cfg.RotationEnabled {
		m.rotator.Start()
	}
	return m
}

// Config returns the manager's config.
func (m *Manager) Config() *config.Config {
	return m.config
}

// Rotator returns the manager's rotator.
func (m *Manager) Rotator() *Rotator {
	return m.rotator
}

// LoadProxies loads proxies from a JSON file.
// It supports both array format and object format with "proxies" key.
func (m *Manager) LoadProxies() ([]*models.Proxy, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	data, err := os.ReadFile(m.dataFile)
	if err != nil {
		if os.IsNotExist(err) {
			// No proxies file yet, returning empty slice without error
			return m.proxies, nil
		}
		return nil, fmt.Errorf("failed to read proxies file: %w", err)
	}

	// Try format 2: ProxyDataFile
	var dataFile models.ProxyDataFile
	if err := json.Unmarshal(data, &dataFile); err == nil && len(dataFile.Proxies) > 0 {
		m.importEntries(dataFile.Proxies)
	} else {
		// Try format 1: Array of ProxyEntry
		var entries []models.ProxyEntry
		if err := json.Unmarshal(data, &entries); err != nil {
			return nil, fmt.Errorf("failed to parse proxies file: invalid format")
		}
		m.importEntries(entries)
	}

	// Try to load saved status if exists
	m.loadStatusFile()

	return m.proxies, nil
}

// importEntries converts ProxyEntry into models.Proxy and registers them.
// Requires m.mu to be locked.
func (m *Manager) importEntries(entries []models.ProxyEntry) {
	for _, entry := range entries {
		ptype := entry.Protocol
		if ptype == "" {
			ptype = entry.Type
		}
		
		p := &models.Proxy{
			IP:   entry.IP,
			Port: entry.Port,
			Type: models.ProxyType(strings.ToLower(ptype)),
		}
		
		if entry.Username != nil {
			p.Username = *entry.Username
		}
		if entry.Password != nil {
			p.Password = *entry.Password
		}
		if entry.Geolocation != nil {
			p.Country = entry.Geolocation.Country
			p.City = entry.Geolocation.City
		}

		p.ID = p.GenerateID()

		// Add if not exists
		if _, exists := m.byID[p.ID]; !exists {
			m.proxies = append(m.proxies, p)
			m.byID[p.ID] = p
			m.status[p.ID] = &models.ProxyStatus{}
		}
	}
}

// loadStatusFile attempts to load previously saved proxy statuses.
func (m *Manager) loadStatusFile() {
	data, err := os.ReadFile(m.statusFile)
	if err != nil {
		return // Ignore if doesn't exist
	}
	
	var savedStatus map[string]*models.ProxyStatus
	if err := json.Unmarshal(data, &savedStatus); err == nil {
		for id, s := range savedStatus {
			if _, exists := m.status[id]; exists {
				m.status[id] = s
			}
		}
	}
}

// saveStatusFile saves the current proxy statuses to disk.
func (m *Manager) saveStatusFile() {
	data, err := json.MarshalIndent(m.status, "", "  ")
	if err == nil {
		_ = os.WriteFile(m.statusFile, data, 0644)
	}
}

// GetAllProxies returns all proxies in the pool.
func (m *Manager) GetAllProxies() []*models.Proxy {
	m.mu.RLock()
	defer m.mu.RUnlock()
	
	// Create a copy to prevent data races
	res := make([]*models.Proxy, len(m.proxies))
	copy(res, m.proxies)
	return res
}

// UpdateStatus updates the health status of proxies after a check.
func (m *Manager) UpdateStatus(results []*models.CheckResult) {
	m.mu.Lock()
	defer m.mu.Unlock()

	for _, res := range results {
		if res == nil {
			continue
		}

		status, exists := m.status[res.ID]
		if !exists {
			continue
		}

		// Save country if discovered
		if res.Country != "" && res.Country != "Unknown" {
			for _, p := range m.proxies {
				if p.ID == res.ID {
					p.Country = res.Country
					break
				}
			}
		}

		m.analytics.RecordCheck(status, res.Alive, res.ResponseTimeMs)

		if res.Alive {
			status.Alive = true
			status.SSLVerified = res.SSLVerified
		} else {
			// Determine if it should be marked dead
			if status.ConsecutiveFailures >= m.config.MaxConsecFailures {
				status.Alive = false
			}
			if status.ConsecutiveFailures >= m.config.BlacklistAfterFails {
				status.Blacklisted = true
			}
		}
	}
	
	m.saveStatusFile()
}

// GetAliveProxies returns proxies that are currently alive.
func (m *Manager) GetAliveProxies() []*models.Proxy {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var alive []*models.Proxy
	for _, p := range m.proxies {
		if m.isEligibleByCountry(p) {
			status := m.status[p.ID]
			if status != nil && status.Alive && !status.Blacklisted {
				alive = append(alive, p)
			}
		}
	}
	return alive
}

// GetDeadForRetry returns dead proxies eligible for a second chance.
func (m *Manager) GetDeadForRetry() []*models.Proxy {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var retryable []*models.Proxy
	now := time.Now()
	retryDuration := time.Duration(m.config.DeadRetryAfterSec) * time.Second

	for _, p := range m.proxies {
		status := m.status[p.ID]
		if status == nil || status.Blacklisted || status.Alive {
			continue
		}

		// It's dead. Is it time to retry?
		if status.ConsecutiveFailures > 0 && now.Sub(status.LastChecked) > retryDuration {
			retryable = append(retryable, p)
		}
	}
	return retryable
}

// GetUnchecked returns up to `limit` proxies that have never been checked.
func (m *Manager) GetUnchecked(limit int) []*models.Proxy {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var unchecked []*models.Proxy
	for _, p := range m.proxies {
		status := m.status[p.ID]
		if status != nil && status.TotalChecks == 0 && !status.Blacklisted {
			unchecked = append(unchecked, p)
			if limit > 0 && len(unchecked) >= limit {
				break
			}
		}
	}
	return unchecked
}

// CalculateScore computes a proxy's score based on the manager's configuration.
func (m *Manager) CalculateScore(p *models.Proxy) float64 {
	m.mu.RLock()
	defer m.mu.RUnlock()

	status := m.status[p.ID]
	if status == nil || status.Blacklisted {
		return 0
	}

	score := 0.0

	if status.Alive {
		score += m.config.ScoreAlive
	}

	// Speed Score
	if status.ResponseTimeMs > 0 {
		speedThreshold := float64(m.config.MaxSpeedMs)
		speedWeight := m.config.ScoreSpeedMax
		
		if speedThreshold > 0 {
			// User explicitly set a speed limit! Make it highly dominant over SSL/Success!
			speedWeight = 500.0 
		} else {
			speedThreshold = 2000.0 // default assumption if not set
			speedWeight = 200.0     // Ensure speed still strongly influences Auto mode
		}
		
		speedFactor := 1.0 - (status.ResponseTimeMs / speedThreshold)
		
		if speedThreshold > 0 && speedFactor < 0 {
			// Allow negative penalty to destroy the score of proxies slower than requested limit
			score += speedWeight * speedFactor 
		} else {
			if speedFactor < 0 {
				speedFactor = 0
			}
			score += speedWeight * speedFactor
		}
	}

	// Recency Score (1 hour = max degradation)
	if !status.LastAlive.IsZero() {
		hoursSinceAlive := time.Since(status.LastAlive).Hours()
		recencyFactor := 1.0 - hoursSinceAlive
		if recencyFactor < 0 {
			recencyFactor = 0
		}
		score += m.config.ScoreRecencyMax * recencyFactor
	}

	// Success Rate
	successRate := status.SuccessRate() / 100.0
	score += m.config.ScoreSuccessRateMax * successRate

	// SSL Bonus
	if status.SSLVerified {
		score += m.config.ScoreSSLBonus
	}

	// Failure Penalty
	penalty := float64(status.ConsecutiveFailures) * m.config.ScoreFailurePenalty
	score -= penalty

	if score < 0 {
		score = 0
	}

	return score
}

// GetPoolSummary returns aggregated statistics for the proxy pool.
func (m *Manager) GetPoolSummary() *models.PoolSummary {
	m.mu.RLock()
	defer m.mu.RUnlock()

	summary := &models.PoolSummary{
		Total: len(m.proxies),
	}

	now := time.Now()
	retryDuration := time.Duration(m.config.DeadRetryAfterSec) * time.Second

	for _, status := range m.status {
		if status.Blacklisted {
			summary.Blacklisted++
		} else if status.TotalChecks == 0 {
			summary.Unchecked++
		} else if status.Alive {
			summary.Alive++
		} else {
			summary.Dead++
			if status.ConsecutiveFailures > 0 && now.Sub(status.LastChecked) > retryDuration {
				summary.DeadRetryable++
			}
		}
	}
	return summary
}

// GetDashboardData returns the top proxies ordered by score.
func (m *Manager) GetDashboardData() []*models.DashboardItem {
	m.mu.RLock()
	
	items := make([]*models.DashboardItem, 0, len(m.proxies))
	for _, p := range m.proxies {
		// Only show proxies that meet the country filter
		if !m.isEligibleByCountry(p) {
			continue
		}
		
		status := m.status[p.ID]
		// Don't show blacklisted proxies on dashboard
		if status != nil && !status.Blacklisted {
			// Deep copy to prevent external mutation
			statusCopy := *status
			proxyCopy := *p
			
			items = append(items, &models.DashboardItem{
				Proxy:  &proxyCopy,
				Status: &statusCopy,
			})
		}
	}
	m.mu.RUnlock()

	// Calculate score for each
	for _, item := range items {
		item.Score = m.CalculateScore(item.Proxy)
	}

	// Sort by Score DESC
	sort.Slice(items, func(i, j int) bool {
		return items[i].Score > items[j].Score
	})

	// Limit to top 30
	if len(items) > 30 {
		items = items[:30]
	}

	return items
}

// GetProxyStatus returns the status of a specific proxy.
func (m *Manager) GetProxyStatus(id string) *models.ProxyStatus {
	m.mu.RLock()
	defer m.mu.RUnlock()
	
	if status, exists := m.status[id]; exists {
		// Return copy to prevent mutation
		copy := *status
		return &copy
	}
	return nil
}

// AddCustomProxies manually adds multiple new proxies to the pool.
func (m *Manager) AddCustomProxies(entries []models.ProxyEntry) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.importEntries(entries)
}

// AddCustomProxy manually adds a new proxy to the pool.
func (m *Manager) AddCustomProxy(ip string, port int, ptype string, user, pass string) *models.Proxy {
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
		
		// Trigger async save
		go func() {
			m.mu.RLock()
			defer m.mu.RUnlock()
			m.SaveSortedDataFile()
		}()
	}

	return m.byID[p.ID]
}

// GetAvailableCountries returns a list of countries available in the pool with counts.
func (m *Manager) GetAvailableCountries() []CountryInfo {
	m.mu.RLock()
	defer m.mu.RUnlock()

	counts := make(map[string]int)
	for _, p := range m.proxies {
		status := m.status[p.ID]
		if status != nil && status.Alive {
			country := p.Country
			if country == "" {
				country = "Unknown"
			}
			counts[country]++
		}
	}

	var result []CountryInfo
	for name, count := range counts {
		result = append(result, CountryInfo{Name: name, Count: count})
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].Count > result[j].Count
	})

	return result
}

// SaveSortedDataFile sorts the proxies by score and saves them to dataFile.
func (m *Manager) SaveSortedDataFile() {
	// We can reuse GetDashboardData logic but for all proxies
	// to avoid locking the entire struct while saving
	
	m.mu.RLock()
	items := make([]*models.DashboardItem, 0, len(m.proxies))
	for _, p := range m.proxies {
		items = append(items, &models.DashboardItem{
			Proxy: p,
		})
	}
	m.mu.RUnlock()

	// Calculate score (CalculateScore locks internally, but briefly per proxy)
	for _, item := range items {
		item.Score = m.CalculateScore(item.Proxy)
	}

	// Sort
	sort.Slice(items, func(i, j int) bool {
		return items[i].Score > items[j].Score
	})

	// Build entry format
	var entries []models.ProxyEntry
	for _, item := range items {
		p := item.Proxy
		entry := models.ProxyEntry{
			IP:   p.IP,
			Port: p.Port,
			Type: string(p.Type),
		}
		if p.Username != "" {
			entry.Username = &p.Username
		}
		if p.Password != "" {
			entry.Password = &p.Password
		}
		if p.Country != "" || p.City != "" {
			entry.Geolocation = &models.Geolocation{
				Country: p.Country,
				City:    p.City,
			}
		}
		entries = append(entries, entry)
	}

	dataFile := models.ProxyDataFile{Proxies: entries}
	data, err := json.MarshalIndent(dataFile, "", "  ")
	if err == nil {
		m.mu.RLock()
		filePath := m.dataFile
		m.mu.RUnlock()
		
		_ = os.WriteFile(filePath, data, 0644)
	}
}

// isEligibleByCountry checks if a proxy matches the current country filter.
// Assumes caller holds a read lock.
func (m *Manager) isEligibleByCountry(p *models.Proxy) bool {
	filter := strings.ToUpper(m.config.CountryFilter)
	if filter == "" || filter == "GLOBAL" {
		return true
	}
	return strings.ToUpper(p.Country) == filter
}

// ReportFailure explicitly marks a proxy as failed and penalizes it immediately.
func (m *Manager) ReportFailure(proxyID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	status, exists := m.status[proxyID]
	if !exists {
		return
	}

	status.Alive = false
	status.Blacklisted = true // Drop garbage proxies completely
	status.ConsecutiveFailures += 10
	status.TotalChecks++
	status.LastChecked = time.Now()
	
	// Analytics penalizes based on ConsecutiveFailures, but we force Alive=false
	// so it gets temporarily blacklisted until the next check.
	m.saveStatusFile()
}

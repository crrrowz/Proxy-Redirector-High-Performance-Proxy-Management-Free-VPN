package adblock

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
)

// WildcardRule represents a pattern-based blocking rule.
type WildcardRule struct {
	Pattern  string `json:"pattern"`
	Category string `json:"category"`
}

// BlockStats holds statistics about blocked requests.
type BlockStats struct {
	TotalBlocked      int64            `json:"total_blocked"`
	BlockedByDomain   map[string]int64 `json:"blocked_by_domain"`
	BlockedByCategory map[string]int64 `json:"blocked_by_category"`
}

// BlocklistData represents the JSON structure of the blocklist file.
type BlocklistData struct {
	Enabled           bool              `json:"enabled"`
	CategoriesEnabled map[string]bool   `json:"categories_enabled"`
	ExactDomains      map[string]string `json:"exact_domains"`
	WildcardRules     []WildcardRule    `json:"wildcard_rules"`
	Whitelist         []string          `json:"whitelist"`
}

// Engine handles domain-level ad and malware blocking.
type Engine struct {
	enabled           bool
	exactDomains      map[string]string
	wildcardRules     []WildcardRule
	whitelist         map[string]bool
	categoriesEnabled map[string]bool
	stats             BlockStats
	mu                sync.RWMutex
	filePath          string
}

// NewEngine creates a new AdBlock engine and loads the blocklist.
func NewEngine(filePath string) *Engine {
	e := &Engine{
		enabled:           true,
		exactDomains:      make(map[string]string),
		wildcardRules:     make([]WildcardRule, 0),
		whitelist:         make(map[string]bool),
		categoriesEnabled: map[string]bool{"ads": true, "tracking": true, "malware": true, "custom": true},
		stats: BlockStats{
			BlockedByDomain:   make(map[string]int64),
			BlockedByCategory: make(map[string]int64),
		},
		filePath: filePath,
	}

	// Load existing or set defaults
	if err := e.Load(); err != nil {
		e.loadDefaults()
		_ = e.Save()
	}

	return e
}

// loadDefaults populates the engine with a default set of known trackers/ads.
func (e *Engine) loadDefaults() {
	e.exactDomains = map[string]string{
		"doubleclick.net":        "ads",
		"googlesyndication.com":  "ads",
		"adnxs.com":              "ads",
		"taboola.com":            "ads",
		"facebook.net":           "tracking",
		"google-analytics.com":   "tracking",
		"hotjar.com":             "tracking",
		"clarity.ms":             "tracking",
		"malwaredomainlist.com":  "malware",
	}
}

// ShouldBlock checks if a domain should be blocked based on the rules.
// It checks whitelist -> exact (including parents) -> wildcard.
func (e *Engine) ShouldBlock(domain string) (blocked bool, category string) {
	e.mu.RLock()
	defer e.mu.RUnlock()

	if !e.enabled {
		return false, ""
	}

	domain = strings.ToLower(strings.TrimSpace(domain))
	if domain == "" {
		return false, ""
	}

	// 1. Whitelist Check
	if e.whitelist[domain] {
		return false, ""
	}
	// Check parent domains for whitelist too
	parts := strings.Split(domain, ".")
	for i := 1; i < len(parts)-1; i++ {
		parent := strings.Join(parts[i:], ".")
		if e.whitelist[parent] {
			return false, ""
		}
	}

	// 2. Exact Match (including parents)
	current := domain
	for {
		if cat, exists := e.exactDomains[current]; exists {
			if e.categoriesEnabled[cat] {
				e.recordStat(domain, cat)
				return true, cat
			}
		}
		
		idx := strings.Index(current, ".")
		if idx == -1 {
			break
		}
		current = current[idx+1:]
	}

	// 3. Wildcard Match
	for _, rule := range e.wildcardRules {
		if !e.categoriesEnabled[rule.Category] {
			continue
		}
		
		if matchWildcard(rule.Pattern, domain) {
			e.recordStat(domain, rule.Category)
			return true, rule.Category
		}
	}

	return false, ""
}

// recordStat updates the blocking statistics.
// Assumes caller holds e.mu (at least RLock, but since we modify, we need a trick or upgrade).
// Actually, to avoid locking everything on every block, we should use atomic or a separate mutex.
// For simplicity in this implementation, we will use a separate lock or upgrade to write lock.
// Since we only call this when blocking, it's not the hot path. But to be safe, we'll do it safely.
// We'll unlock RLock, Lock, update, Unlock, RLock... wait, that's complex inside ShouldBlock.
// Let's just do a concurrent map or channel in a real high-perf scenario.
// Here we'll just acquire full Lock temporarily for the stats.
func (e *Engine) recordStat(domain, category string) {
	// We're currently holding RLock from ShouldBlock. We can't upgrade.
	// Instead, we can do a background goroutine for stats, or just use sync.Map for stats.
	// Let's spawn a goroutine to update stats so we don't block the hot path.
	go func(d, c string) {
		e.mu.Lock()
		defer e.mu.Unlock()
		e.stats.TotalBlocked++
		e.stats.BlockedByDomain[d]++
		e.stats.BlockedByCategory[c]++
	}(domain, category)
}

// matchWildcard implements a simple wildcard matching (*).
func matchWildcard(pattern, name string) bool {
	if pattern == "" {
		return name == ""
	}
	if pattern == "*" {
		return true
	}
	
	// Very basic implementation: just handles *foo* or foo* or *foo
	parts := strings.Split(pattern, "*")
	if len(parts) == 1 {
		return pattern == name
	}
	
	if !strings.HasPrefix(name, parts[0]) {
		return false
	}
	if !strings.HasSuffix(name, parts[len(parts)-1]) {
		return false
	}
	
	current := name
	for _, part := range parts {
		if part == "" {
			continue
		}
		idx := strings.Index(current, part)
		if idx == -1 {
			return false
		}
		current = current[idx+len(part):]
	}
	
	return true
}

// AddRule adds a domain to the blocklist.
func (e *Engine) AddRule(domain, category string) bool {
	e.mu.Lock()
	defer e.mu.Unlock()
	
	domain = strings.ToLower(strings.TrimSpace(domain))
	if domain == "" {
		return false
	}
	
	e.exactDomains[domain] = category
	_ = e.saveUnlocked()
	return true
}

// RemoveRule removes a domain from the blocklist.
func (e *Engine) RemoveRule(domain string) bool {
	e.mu.Lock()
	defer e.mu.Unlock()
	
	domain = strings.ToLower(strings.TrimSpace(domain))
	if _, exists := e.exactDomains[domain]; exists {
		delete(e.exactDomains, domain)
		_ = e.saveUnlocked()
		return true
	}
	return false
}

// AddWhitelist adds a domain to the whitelist.
func (e *Engine) AddWhitelist(domain string) bool {
	e.mu.Lock()
	defer e.mu.Unlock()
	
	domain = strings.ToLower(strings.TrimSpace(domain))
	e.whitelist[domain] = true
	_ = e.saveUnlocked()
	return true
}

// RemoveWhitelist removes a domain from the whitelist.
func (e *Engine) RemoveWhitelist(domain string) bool {
	e.mu.Lock()
	defer e.mu.Unlock()
	
	domain = strings.ToLower(strings.TrimSpace(domain))
	if e.whitelist[domain] {
		delete(e.whitelist, domain)
		_ = e.saveUnlocked()
		return true
	}
	return false
}

// ToggleCategory enables or disables a specific blocking category.
func (e *Engine) ToggleCategory(category string, enabled bool) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.categoriesEnabled[category] = enabled
	_ = e.saveUnlocked()
}

// ToggleEnabled turns the entire adblock engine on or off.
func (e *Engine) ToggleEnabled(enabled bool) {
	e.mu.Lock()
	defer e.mu.Unlock()
	e.enabled = enabled
	_ = e.saveUnlocked()
}

// GetStats returns a copy of the current blocking statistics.
func (e *Engine) GetStats() BlockStats {
	e.mu.RLock()
	defer e.mu.RUnlock()
	
	// Deep copy
	stats := BlockStats{
		TotalBlocked:      e.stats.TotalBlocked,
		BlockedByDomain:   make(map[string]int64),
		BlockedByCategory: make(map[string]int64),
	}
	for k, v := range e.stats.BlockedByDomain {
		stats.BlockedByDomain[k] = v
	}
	for k, v := range e.stats.BlockedByCategory {
		stats.BlockedByCategory[k] = v
	}
	
	return stats
}

// GetRules returns a copy of all exact domain rules.
func (e *Engine) GetRules() map[string]string {
	e.mu.RLock()
	defer e.mu.RUnlock()
	
	rules := make(map[string]string)
	for k, v := range e.exactDomains {
		rules[k] = v
	}
	return rules
}

// GetWhitelist returns all whitelisted domains.
func (e *Engine) GetWhitelist() []string {
	e.mu.RLock()
	defer e.mu.RUnlock()
	
	var list []string
	for k := range e.whitelist {
		list = append(list, k)
	}
	return list
}

// GetCategories returns the status of all categories.
func (e *Engine) GetCategories() map[string]bool {
	e.mu.RLock()
	defer e.mu.RUnlock()
	
	cats := make(map[string]bool)
	for k, v := range e.categoriesEnabled {
		cats[k] = v
	}
	return cats
}

// Load loads the blocklist from the JSON file.
func (e *Engine) Load() error {
	e.mu.Lock()
	defer e.mu.Unlock()

	if e.filePath == "" {
		return fmt.Errorf("no file path specified")
	}

	data, err := os.ReadFile(e.filePath)
	if err != nil {
		return err
	}

	var parsed BlocklistData
	if err := json.Unmarshal(data, &parsed); err != nil {
		return err
	}

	e.enabled = parsed.Enabled
	e.exactDomains = parsed.ExactDomains
	e.wildcardRules = parsed.WildcardRules
	e.categoriesEnabled = parsed.CategoriesEnabled
	
	if e.exactDomains == nil {
		e.exactDomains = make(map[string]string)
	}
	if e.categoriesEnabled == nil {
		e.categoriesEnabled = make(map[string]bool)
	}
	
	e.whitelist = make(map[string]bool)
	for _, w := range parsed.Whitelist {
		e.whitelist[w] = true
	}

	return nil
}

// Save saves the current rules to the JSON file.
func (e *Engine) Save() error {
	e.mu.RLock()
	defer e.mu.RUnlock()
	return e.saveUnlocked()
}

func (e *Engine) saveUnlocked() error {
	if e.filePath == "" {
		return nil
	}

	whitelist := make([]string, 0, len(e.whitelist))
	for k := range e.whitelist {
		whitelist = append(whitelist, k)
	}

	data := BlocklistData{
		Enabled:           e.enabled,
		CategoriesEnabled: e.categoriesEnabled,
		ExactDomains:      e.exactDomains,
		WildcardRules:     e.wildcardRules,
		Whitelist:         whitelist,
	}

	bytes, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return err
	}

	// Ensure dir exists
	dir := filepath.Dir(e.filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	return os.WriteFile(e.filePath, bytes, 0644)
}


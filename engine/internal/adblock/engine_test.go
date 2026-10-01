package adblock

import (
	"os"
	"path/filepath"
	"testing"
)

func TestNewEngine_LoadsDefaults(t *testing.T) {
	tmpDir := t.TempDir()
	fp := filepath.Join(tmpDir, "blocklist.json")

	e := NewEngine(fp)
	if e == nil {
		t.Fatal("NewEngine returned nil")
	}
	if !e.enabled {
		t.Error("engine should be enabled by default")
	}
	// Should have created the file with defaults
	if _, err := os.Stat(fp); err != nil {
		t.Errorf("expected blocklist file to be created: %v", err)
	}
}

func TestShouldBlock_ExactDomain(t *testing.T) {
	e := newTestEngine(t)

	tests := []struct {
		name     string
		domain   string
		blocked  bool
		category string
	}{
		{"exact match", "doubleclick.net", true, "ads"},
		{"subdomain inherits parent", "ads.doubleclick.net", true, "ads"},
		{"no match", "example.com", false, ""},
		{"tracking domain", "google-analytics.com", true, "tracking"},
		{"malware domain", "malwaredomainlist.com", true, "malware"},
		{"empty domain", "", false, ""},
		{"case insensitive", "DoubleClick.NET", true, "ads"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			blocked, cat := e.ShouldBlock(tt.domain)
			if blocked != tt.blocked {
				t.Errorf("ShouldBlock(%q) blocked = %v, want %v", tt.domain, blocked, tt.blocked)
			}
			if cat != tt.category {
				t.Errorf("ShouldBlock(%q) category = %q, want %q", tt.domain, cat, tt.category)
			}
		})
	}
}

func TestShouldBlock_Whitelist(t *testing.T) {
	e := newTestEngine(t)
	e.AddWhitelist("doubleclick.net")

	blocked, _ := e.ShouldBlock("doubleclick.net")
	if blocked {
		t.Error("whitelisted domain should not be blocked")
	}

	// Subdomain should also be whitelisted (parent whitelist)
	blocked, _ = e.ShouldBlock("ads.doubleclick.net")
	if blocked {
		t.Error("subdomain of whitelisted domain should not be blocked")
	}
}

func TestShouldBlock_DisabledEngine(t *testing.T) {
	e := newTestEngine(t)
	e.ToggleEnabled(false)

	blocked, _ := e.ShouldBlock("doubleclick.net")
	if blocked {
		t.Error("disabled engine should not block anything")
	}
}

func TestShouldBlock_DisabledCategory(t *testing.T) {
	e := newTestEngine(t)
	e.ToggleCategory("ads", false)

	blocked, _ := e.ShouldBlock("doubleclick.net")
	if blocked {
		t.Error("domain in disabled category should not be blocked")
	}

	// Tracking should still work
	blocked, _ = e.ShouldBlock("google-analytics.com")
	if !blocked {
		t.Error("tracking domain should still be blocked")
	}
}

func TestShouldBlock_WildcardRules(t *testing.T) {
	e := newTestEngine(t)
	e.mu.Lock()
	e.wildcardRules = []WildcardRule{
		{Pattern: "*tracker*", Category: "tracking"},
		{Pattern: "ads.*", Category: "ads"},
		{Pattern: "*.malware.org", Category: "malware"},
	}
	e.mu.Unlock()

	tests := []struct {
		name    string
		domain  string
		blocked bool
	}{
		{"wildcard middle match", "sometracker.com", true},
		{"wildcard prefix match", "ads.example.com", true},
		{"wildcard suffix match", "bad.malware.org", true},
		{"no wildcard match", "safe.example.org", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			blocked, _ := e.ShouldBlock(tt.domain)
			if blocked != tt.blocked {
				t.Errorf("ShouldBlock(%q) = %v, want %v", tt.domain, blocked, tt.blocked)
			}
		})
	}
}

func TestMatchWildcard(t *testing.T) {
	tests := []struct {
		pattern string
		name    string
		want    bool
	}{
		{"*", "anything", true},
		{"*tracker*", "mytracker.com", true},
		{"*tracker*", "safe.com", false},
		{"ads.*", "ads.example.com", true},
		{"ads.*", "notads.example.com", false},
		{"*.org", "example.org", true},
		{"*.org", "example.com", false},
		{"", "", true},
		{"", "notempty", false},
		{"exact", "exact", true},
		{"exact", "notexact", false},
	}

	for _, tt := range tests {
		t.Run(tt.pattern+"_"+tt.name, func(t *testing.T) {
			got := matchWildcard(tt.pattern, tt.name)
			if got != tt.want {
				t.Errorf("matchWildcard(%q, %q) = %v, want %v", tt.pattern, tt.name, got, tt.want)
			}
		})
	}
}

func TestAddRemoveRule(t *testing.T) {
	e := newTestEngine(t)

	ok := e.AddRule("evil.com", "malware")
	if !ok {
		t.Fatal("AddRule should return true")
	}

	blocked, cat := e.ShouldBlock("evil.com")
	if !blocked || cat != "malware" {
		t.Errorf("added rule should block: blocked=%v, cat=%s", blocked, cat)
	}

	ok = e.RemoveRule("evil.com")
	if !ok {
		t.Fatal("RemoveRule should return true for existing rule")
	}

	blocked, _ = e.ShouldBlock("evil.com")
	if blocked {
		t.Error("removed rule should not block")
	}

	// Remove non-existent
	ok = e.RemoveRule("nonexistent.com")
	if ok {
		t.Error("RemoveRule should return false for non-existent rule")
	}
}

func TestAddRemoveWhitelist(t *testing.T) {
	e := newTestEngine(t)

	e.AddWhitelist("safe.com")
	wl := e.GetWhitelist()
	found := false
	for _, d := range wl {
		if d == "safe.com" {
			found = true
		}
	}
	if !found {
		t.Error("safe.com should be in whitelist")
	}

	ok := e.RemoveWhitelist("safe.com")
	if !ok {
		t.Error("RemoveWhitelist should return true")
	}

	ok = e.RemoveWhitelist("nonexistent.com")
	if ok {
		t.Error("RemoveWhitelist should return false for non-existent")
	}
}

func TestLoadSave_Roundtrip(t *testing.T) {
	tmpDir := t.TempDir()
	fp := filepath.Join(tmpDir, "blocklist.json")

	e1 := NewEngine(fp)
	e1.AddRule("test.com", "custom")
	e1.AddWhitelist("safe.com")
	_ = e1.Save()

	// Create a new engine from the same file
	e2 := NewEngine(fp)
	rules := e2.GetRules()
	if _, exists := rules["test.com"]; !exists {
		t.Error("expected test.com in loaded rules")
	}

	wl := e2.GetWhitelist()
	found := false
	for _, d := range wl {
		if d == "safe.com" {
			found = true
		}
	}
	if !found {
		t.Error("expected safe.com in loaded whitelist")
	}
}

func TestGetStats(t *testing.T) {
	e := newTestEngine(t)
	stats := e.GetStats()
	if stats.TotalBlocked != 0 {
		t.Errorf("expected 0 total blocked, got %d", stats.TotalBlocked)
	}
}

func TestGetCategories(t *testing.T) {
	e := newTestEngine(t)
	cats := e.GetCategories()
	expected := []string{"ads", "tracking", "malware", "custom"}
	for _, c := range expected {
		if _, exists := cats[c]; !exists {
			t.Errorf("expected category %q", c)
		}
	}
}

func TestAddRule_EmptyDomain(t *testing.T) {
	e := newTestEngine(t)
	ok := e.AddRule("", "ads")
	if ok {
		t.Error("AddRule with empty domain should return false")
	}
}

// --- helpers ---

func newTestEngine(t *testing.T) *Engine {
	t.Helper()
	tmpDir := t.TempDir()
	fp := filepath.Join(tmpDir, "blocklist.json")
	return NewEngine(fp)
}

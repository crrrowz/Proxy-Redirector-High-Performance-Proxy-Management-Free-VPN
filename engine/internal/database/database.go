// Package database provides the persistence layer for Engine.
package database

import (
	"time"

	"github.com/crrrowz/proxy-redirector-v3/shared/models"
)

// ProxyRecord is the database representation of a proxy with its status.
type ProxyRecord struct {
	ID                  string    `json:"id"`
	IP                  string    `json:"ip"`
	Port                int       `json:"port"`
	Type                string    `json:"type"`
	Username            string    `json:"username,omitempty"`
	Password            string    `json:"password,omitempty"`
	Country             string    `json:"country,omitempty"`
	City                string    `json:"city,omitempty"`
	Alive               bool      `json:"alive"`
	SpeedMs             float64   `json:"speed_ms"`
	Score               float64   `json:"score"`
	SSLVerified         bool      `json:"ssl_verified"`
	ConsecutiveFailures int       `json:"consecutive_failures"`
	TotalChecks         int       `json:"total_checks"`
	TotalSuccesses      int       `json:"total_successes"`
	Blacklisted         bool      `json:"blacklisted"`
	LastChecked         time.Time `json:"last_checked"`
	LastAlive           time.Time `json:"last_alive"`
	CreatedAt           time.Time `json:"created_at"`
}

// AnalyticsRecord stores proxy performance analytics.
type AnalyticsRecord struct {
	ProxyID          string  `json:"proxy_id"`
	AvgSpeedMs       float64 `json:"avg_speed_ms"`
	MinSpeedMs       float64 `json:"min_speed_ms"`
	MaxSpeedMs       float64 `json:"max_speed_ms"`
	UptimePct        float64 `json:"uptime_pct"`
	ReliabilityScore float64 `json:"reliability_score"`
	Tags             string  `json:"tags"` // JSON array
	TotalChecks      int     `json:"total_checks"`
	TotalSuccesses   int     `json:"total_successes"`
}

// ProxyFilters controls what proxies are returned from queries.
type ProxyFilters struct {
	Country     string
	AliveOnly   bool
	Limit       int
	ExcludeDead bool
}

// DB is the interface shared between SQLite and PostgreSQL implementations.
type DB interface {
	// Proxies
	SaveProxies(proxies []*models.Proxy, statuses map[string]*models.ProxyStatus) error
	GetProxies(filters ProxyFilters) ([]ProxyRecord, error)
	UpdateProxyStatus(id string, status *models.ProxyStatus) error
	GetProxyCount() (total, alive, dead int, err error)

	// Analytics
	SaveAnalytics(record *AnalyticsRecord) error
	GetAnalytics(proxyID string) (*AnalyticsRecord, error)
	GetTopProxies(limit int) ([]AnalyticsRecord, error)

	// Config (key-value store)
	GetConfigValue(key string) (string, error)
	SetConfigValue(key, value string) error
	GetAllConfig() (map[string]string, error)

	// Lifecycle
	Migrate() error
	Close() error
}

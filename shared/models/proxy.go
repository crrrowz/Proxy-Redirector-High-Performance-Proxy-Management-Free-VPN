// Package models defines shared data structures used by both Engine and Client.
package models

import (
	"fmt"
	"time"
)

// ProxyType represents the protocol type of a proxy.
type ProxyType string

const (
	ProxySOCKS5 ProxyType = "socks5"
	ProxySOCKS4 ProxyType = "socks4"
	ProxyHTTP   ProxyType = "http"
	ProxyHTTPS  ProxyType = "https"
)

// Proxy represents a single proxy entry.
type Proxy struct {
	ID       string    `json:"id"`
	IP       string    `json:"ip"`
	Port     int       `json:"port"`
	Type     ProxyType `json:"type"`
	Username string    `json:"username,omitempty"`
	Password string    `json:"password,omitempty"`
	Country  string    `json:"country,omitempty"`
	City     string    `json:"city,omitempty"`
	Ping     float64   `json:"ping,omitempty"`
}

// Address returns "ip:port".
func (p *Proxy) Address() string {
	return fmt.Sprintf("%s:%d", p.IP, p.Port)
}

// GenerateID generates a unique ID from ip:port.
func (p *Proxy) GenerateID() string {
	return fmt.Sprintf("%s_%d", p.IP, p.Port)
}

// ProxyStatus holds the runtime health status of a proxy.
type ProxyStatus struct {
	Alive               bool      `json:"alive"`
	ResponseTimeMs      float64   `json:"response_time_ms,omitempty"`
	SSLVerified         bool      `json:"ssl_verified"`
	ConsecutiveFailures int       `json:"consecutive_failures"`
	TotalChecks         int       `json:"total_checks"`
	TotalSuccesses      int       `json:"total_successes"`
	LastChecked         time.Time `json:"last_checked"`
	LastAlive           time.Time `json:"last_alive,omitempty"`
	Blacklisted         bool      `json:"blacklisted"`
	Score               float64   `json:"score"`
	Tags                []string  `json:"tags,omitempty"`
}

// SuccessRate returns the success rate as a percentage.
func (s *ProxyStatus) SuccessRate() float64 {
	if s.TotalChecks == 0 {
		return 0
	}
	return float64(s.TotalSuccesses) / float64(s.TotalChecks) * 100
}

// CheckResult is the result of checking a single proxy.
type CheckResult struct {
	ID             string  `json:"id"`
	Alive          bool    `json:"alive"`
	ResponseTimeMs float64 `json:"response_time_ms,omitempty"`
	SSLVerified    bool    `json:"ssl_verified"`
	Error          string  `json:"error,omitempty"`
	Country        string  `json:"country,omitempty"`
}

// PoolSummary holds aggregate pool statistics.
type PoolSummary struct {
	Total         int `json:"total"`
	Alive         int `json:"alive"`
	Dead          int `json:"dead"`
	DeadRetryable int `json:"dead_retryable"`
	Blacklisted   int `json:"blacklisted"`
	Unchecked     int `json:"unchecked"`
}

// DashboardItem combines a proxy with its status and score for display.
type DashboardItem struct {
	Proxy  *Proxy       `json:"proxy"`
	Status *ProxyStatus `json:"status"`
	Score  float64      `json:"score"`
}

// ProxyDataFile represents the JSON format for the proxy data file.
type ProxyDataFile struct {
	Proxies []ProxyEntry `json:"proxies,omitempty"`
}

// ProxyEntry is a single proxy in the data file.
type ProxyEntry struct {
	IP          string        `json:"ip"`
	Port        int           `json:"port"`
	Type        string        `json:"type"`     // fallback
	Protocol    string        `json:"protocol"` // primary from data.json
	Username    *string       `json:"username"`
	Password    *string       `json:"password"`
	Geolocation *Geolocation  `json:"geolocation,omitempty"`
}

// Geolocation holds geographic information for a proxy.
type Geolocation struct {
	Country string `json:"country,omitempty"`
	City    string `json:"city,omitempty"`
}

package proxy

import (
	"sync"
	"time"

	"github.com/crrrowz/proxy-redirector-v3/shared/models"
)

type AnalyticsEngine struct {
	mu sync.RWMutex
}

func NewAnalyticsEngine() *AnalyticsEngine {
	return &AnalyticsEngine{}
}

// RecordCheck updates the proxy status with the check results and calculates tags.
func (a *AnalyticsEngine) RecordCheck(status *models.ProxyStatus, alive bool, speedMs float64) {
	a.mu.Lock()
	defer a.mu.Unlock()

	status.TotalChecks++
	status.LastChecked = time.Now()

	if alive {
		status.TotalSuccesses++
		status.ConsecutiveFailures = 0
		status.LastAlive = status.LastChecked
		if speedMs > 0 {
			status.ResponseTimeMs = speedMs
		}
	} else {
		status.ConsecutiveFailures++
	}

	score := a.calcReliability(status)
	tags := a.autoTag(status)
	
	status.Score = score
	status.Tags = tags
}

func (a *AnalyticsEngine) calcReliability(s *models.ProxyStatus) float64 {
	if s.TotalChecks == 0 {
		return 0
	}

	// 1. Success Rate (0-60 points)
	successRate := float64(s.TotalSuccesses) / float64(s.TotalChecks)
	score := successRate * 60.0

	// 2. Speed (0-20 points)
	if s.ResponseTimeMs > 0 {
		if s.ResponseTimeMs < 500 {
			score += 20.0
		} else if s.ResponseTimeMs < 1500 {
			score += 10.0
		} else if s.ResponseTimeMs < 3000 {
			score += 5.0
		}
	}

	// 2.5 SSL Bonus (30 points)
	if s.SSLVerified {
		score += 30.0
	}

	// 3. Consecutive Failures Penalty
	penalty := float64(s.ConsecutiveFailures * 10)
	score -= penalty

	if score < 0 {
		score = 0
	}
	if score > 100 {
		score = 100
	}

	return score
}

func (a *AnalyticsEngine) autoTag(s *models.ProxyStatus) []string {
	var tags []string

	// Fast tag
	if s.ResponseTimeMs > 0 && s.ResponseTimeMs < 1000 {
		tags = append(tags, "fast")
	}

	// Stable tag
	if s.TotalChecks > 5 {
		successRate := float64(s.TotalSuccesses) / float64(s.TotalChecks)
		if successRate > 0.8 && s.ConsecutiveFailures == 0 {
			tags = append(tags, "stable")
		} else if successRate < 0.3 || s.ConsecutiveFailures >= 3 {
			tags = append(tags, "failing")
		} else if successRate >= 0.3 && successRate <= 0.8 {
			tags = append(tags, "unstable")
		}
	}

	return tags
}

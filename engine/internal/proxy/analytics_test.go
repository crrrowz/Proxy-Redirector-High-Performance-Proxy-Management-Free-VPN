package proxy

import (
	"testing"
	"time"

	"github.com/crrrowz/proxy-redirector-v3/shared/models"
)

func TestRecordCheck(t *testing.T) {
	tests := []struct {
		name            string
		initialStatus   *models.ProxyStatus
		alive           bool
		speedMs         float64
		wantChecks      int
		wantSuccesses   int
		wantConsecFails int
		wantSpeedMs     float64
	}{
		{
			name:            "alive check increments successes and resets failures",
			initialStatus:   &models.ProxyStatus{TotalChecks: 2, TotalSuccesses: 1, ConsecutiveFailures: 3},
			alive:           true,
			speedMs:         150.0,
			wantChecks:      3,
			wantSuccesses:   2,
			wantConsecFails: 0,
			wantSpeedMs:     150.0,
		},
		{
			name:            "dead check increments consecutive failures",
			initialStatus:   &models.ProxyStatus{TotalChecks: 5, TotalSuccesses: 3, ConsecutiveFailures: 1},
			alive:           false,
			speedMs:         0,
			wantChecks:      6,
			wantSuccesses:   3,
			wantConsecFails: 2,
			wantSpeedMs:     0,
		},
		{
			name:            "alive with zero speed does not overwrite existing speed",
			initialStatus:   &models.ProxyStatus{ResponseTimeMs: 300.0},
			alive:           true,
			speedMs:         0,
			wantChecks:      1,
			wantSuccesses:   1,
			wantConsecFails: 0,
			wantSpeedMs:     300.0,
		},
		{
			name:            "alive updates response time",
			initialStatus:   &models.ProxyStatus{ResponseTimeMs: 500.0},
			alive:           true,
			speedMs:         200.0,
			wantChecks:      1,
			wantSuccesses:   1,
			wantConsecFails: 0,
			wantSpeedMs:     200.0,
		},
		{
			name:            "fresh status first alive check",
			initialStatus:   &models.ProxyStatus{},
			alive:           true,
			speedMs:         100.0,
			wantChecks:      1,
			wantSuccesses:   1,
			wantConsecFails: 0,
			wantSpeedMs:     100.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ae := NewAnalyticsEngine()
			ae.RecordCheck(tt.initialStatus, tt.alive, tt.speedMs)

			if tt.initialStatus.TotalChecks != tt.wantChecks {
				t.Errorf("TotalChecks = %d, want %d", tt.initialStatus.TotalChecks, tt.wantChecks)
			}
			if tt.initialStatus.TotalSuccesses != tt.wantSuccesses {
				t.Errorf("TotalSuccesses = %d, want %d", tt.initialStatus.TotalSuccesses, tt.wantSuccesses)
			}
			if tt.initialStatus.ConsecutiveFailures != tt.wantConsecFails {
				t.Errorf("ConsecutiveFailures = %d, want %d", tt.initialStatus.ConsecutiveFailures, tt.wantConsecFails)
			}
			if tt.initialStatus.ResponseTimeMs != tt.wantSpeedMs {
				t.Errorf("ResponseTimeMs = %f, want %f", tt.initialStatus.ResponseTimeMs, tt.wantSpeedMs)
			}
			if tt.initialStatus.LastChecked.IsZero() {
				t.Error("LastChecked should not be zero after RecordCheck")
			}
			if tt.alive && tt.initialStatus.LastAlive.IsZero() {
				t.Error("LastAlive should not be zero after alive check")
			}
		})
	}
}

func TestRecordCheck_SetsLastAlive(t *testing.T) {
	ae := NewAnalyticsEngine()
	status := &models.ProxyStatus{}

	before := time.Now()
	ae.RecordCheck(status, true, 100.0)

	if status.LastAlive.Before(before) {
		t.Error("LastAlive should be set to approximately now")
	}
}

func TestCalcReliability(t *testing.T) {
	tests := []struct {
		name     string
		status   *models.ProxyStatus
		wantMin  float64
		wantMax  float64
	}{
		{
			name:    "zero checks returns 0",
			status:  &models.ProxyStatus{TotalChecks: 0},
			wantMin: 0,
			wantMax: 0,
		},
		{
			name: "100% success fast proxy with SSL",
			status: &models.ProxyStatus{
				TotalChecks:    10,
				TotalSuccesses: 10,
				ResponseTimeMs: 200,
				SSLVerified:    true,
			},
			// 60 (success) + 20 (speed<500) + 30 (SSL) = 110 → capped at 100
			wantMin: 100,
			wantMax: 100,
		},
		{
			name: "50% success medium speed no SSL",
			status: &models.ProxyStatus{
				TotalChecks:    10,
				TotalSuccesses: 5,
				ResponseTimeMs: 1000,
			},
			// 30 (success) + 10 (speed<1500) = 40
			wantMin: 40,
			wantMax: 40,
		},
		{
			name: "consecutive failures reduce score",
			status: &models.ProxyStatus{
				TotalChecks:         10,
				TotalSuccesses:      8,
				ResponseTimeMs:      400,
				ConsecutiveFailures: 5,
			},
			// 48 (success) + 20 (speed) - 50 (penalty) = 18
			wantMin: 18,
			wantMax: 18,
		},
		{
			name: "massive failures floor at 0",
			status: &models.ProxyStatus{
				TotalChecks:         2,
				TotalSuccesses:      1,
				ResponseTimeMs:      2000,
				ConsecutiveFailures: 20,
			},
			wantMin: 0,
			wantMax: 0,
		},
		{
			name: "slow proxy gets 5 speed points",
			status: &models.ProxyStatus{
				TotalChecks:    10,
				TotalSuccesses: 10,
				ResponseTimeMs: 2500,
			},
			// 60 + 5 = 65
			wantMin: 65,
			wantMax: 65,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ae := NewAnalyticsEngine()
			score := ae.calcReliability(tt.status)
			if score < tt.wantMin || score > tt.wantMax {
				t.Errorf("score = %f, want [%f, %f]", score, tt.wantMin, tt.wantMax)
			}
		})
	}
}

func TestAutoTag(t *testing.T) {
	tests := []struct {
		name     string
		status   *models.ProxyStatus
		wantTags []string
	}{
		{
			name: "fast proxy gets fast tag",
			status: &models.ProxyStatus{
				ResponseTimeMs: 500,
				TotalChecks:    2,
			},
			wantTags: []string{"fast"},
		},
		{
			name: "slow proxy no fast tag",
			status: &models.ProxyStatus{
				ResponseTimeMs: 1500,
				TotalChecks:    2,
			},
			wantTags: nil,
		},
		{
			name: "stable proxy with >80% success",
			status: &models.ProxyStatus{
				ResponseTimeMs:      500,
				TotalChecks:         10,
				TotalSuccesses:      9,
				ConsecutiveFailures: 0,
			},
			wantTags: []string{"fast", "stable"},
		},
		{
			name: "failing proxy with <30% success",
			status: &models.ProxyStatus{
				ResponseTimeMs:      1500,
				TotalChecks:         10,
				TotalSuccesses:      2,
				ConsecutiveFailures: 3,
			},
			wantTags: []string{"failing"},
		},
		{
			name: "unstable proxy between 30-80% success",
			status: &models.ProxyStatus{
				ResponseTimeMs:      1500,
				TotalChecks:         10,
				TotalSuccesses:      5,
				ConsecutiveFailures: 0,
			},
			wantTags: []string{"unstable"},
		},
		{
			name: "too few checks for stability tags",
			status: &models.ProxyStatus{
				TotalChecks:    3,
				TotalSuccesses: 3,
			},
			wantTags: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ae := NewAnalyticsEngine()
			tags := ae.autoTag(tt.status)

			if len(tags) != len(tt.wantTags) {
				t.Fatalf("tags = %v, want %v", tags, tt.wantTags)
			}
			for i, tag := range tags {
				if tag != tt.wantTags[i] {
					t.Errorf("tag[%d] = %q, want %q", i, tag, tt.wantTags[i])
				}
			}
		})
	}
}

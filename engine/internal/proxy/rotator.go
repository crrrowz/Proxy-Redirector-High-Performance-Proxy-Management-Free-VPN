package proxy

import (
	"context"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/crrrowz/proxy-redirector-v3/engine/internal/config"
	"github.com/crrrowz/proxy-redirector-v3/shared/models"
)

// RotationStatus holds the current status of the rotator
type RotationStatus struct {
	Enabled       bool
	PoolSize      int
	CurrentIndex  int
	ActiveProxy   *models.Proxy
	FilteredCount int
}

// Rotator manages dynamic round-robin proxy rotation
type Rotator struct {
	pool          []*models.Proxy
	currentIndex  int
	mu            sync.RWMutex
	config        *config.Config
	manager       *Manager
	ticker        *time.Ticker
	stopCancel    context.CancelFunc
	active        *models.Proxy
	filteredCount int
	onSwitch      func(*models.Proxy)
}

// NewRotator creates a new Rotator instance
func NewRotator(cfg *config.Config, manager *Manager) *Rotator {
	return &Rotator{
		pool:    make([]*models.Proxy, 0),
		config:  cfg,
		manager: manager,
	}
}

// Start begins the proxy rotation routine
func (r *Rotator) Start() {
	r.Stop() // explicitly stop any existing rotation to prevent leaks

	r.mu.Lock()
	defer r.mu.Unlock()

	r.refreshPoolInternal()
	interval := r.config.RotationIntervalSec
	if interval <= 0 {
		interval = 30 // fallback
	}

	ctx, cancel := context.WithCancel(context.Background())
	r.stopCancel = cancel

	r.ticker = time.NewTicker(time.Duration(interval) * time.Second)

	// Switch to first right away
	if len(r.pool) > 0 {
		r.active = r.pool[r.currentIndex]
	}

	go func(ctx context.Context, ticker *time.Ticker) {
		for {
			select {
			case <-ticker.C:
				r.mu.Lock()
				if len(r.pool) > 0 {
					r.currentIndex = (r.currentIndex + 1) % len(r.pool)
					r.active = r.pool[r.currentIndex]
					if r.onSwitch != nil {
						go r.onSwitch(r.active)
					}
				}
				r.mu.Unlock()
			case <-ctx.Done():
				ticker.Stop()
				return
			}
		}
	}(ctx, r.ticker)
}

// Stop ends the proxy rotation routine
func (r *Rotator) Stop() {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.stopCancel != nil {
		r.stopCancel()
		r.stopCancel = nil
	}
	r.active = nil
}

// Next returns the currently active proxy from the rotator
func (r *Rotator) Next() *models.Proxy {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.active
}

// Advance forces the rotator to jump to the next proxy immediately (useful for failures)
func (r *Rotator) Advance() {
	r.mu.Lock()
	defer r.mu.Unlock()
	if len(r.pool) > 0 {
		r.currentIndex = (r.currentIndex + 1) % len(r.pool)
		r.active = r.pool[r.currentIndex]
		
		if r.onSwitch != nil {
			go r.onSwitch(r.active)
		}

		// Reset ticker so it waits full interval from now
		if r.ticker != nil {
			interval := r.config.RotationIntervalSec
			if interval <= 0 {
				interval = 30
			}
			r.ticker.Reset(time.Duration(interval) * time.Second)
		}
	}
}

// RefreshPool manually triggers a pool rebuild based on config filters
func (r *Rotator) RefreshPool() {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.refreshPoolInternal()
}

// refreshPoolInternal handles the actual filtering logic without acquiring lock
func (r *Rotator) refreshPoolInternal() {
	alive := r.manager.GetAliveProxies()
	var filtered []*models.Proxy

	filterCountry := strings.ToUpper(r.config.RotationCountryFilter)
	isGlobal := filterCountry == "" || filterCountry == "GLOBAL"

	// Parse proxy types
	allowedTypes := make(map[string]bool)
	hasAllType := false
	for _, t := range r.config.RotationProxyTypes {
		lowT := strings.ToLower(t)
		if lowT == "all" {
			hasAllType = true
			break
		}
		allowedTypes[lowT] = true
	}

	for _, p := range alive {
		// Type check
		if !hasAllType && !allowedTypes[strings.ToLower(string(p.Type))] {
			continue
		}

		// Country check
		if !isGlobal && strings.ToUpper(p.Country) != filterCountry {
			continue
		}

		status := r.manager.GetProxyStatus(p.ID)
		if status == nil {
			continue
		}

		// SSL check
		if r.config.RotationSSLOnly && !status.SSLVerified {
			continue
		}

		// Speed check: if a strict max speed is set, we must also reject 0 (unchecked/failed proxies)
		if r.config.RotationMaxSpeedMs > 0 {
			if status.ResponseTimeMs == 0 || status.ResponseTimeMs > float64(r.config.RotationMaxSpeedMs) {
				continue
			}
		}

		filtered = append(filtered, p)
	}

	r.filteredCount = len(filtered)

	// Sort by Score
	sort.Slice(filtered, func(i, j int) bool {
		return r.manager.CalculateScore(filtered[i]) > r.manager.CalculateScore(filtered[j])
	})

	if r.config.RotationPoolSize > 0 && len(filtered) > r.config.RotationPoolSize {
		filtered = filtered[:r.config.RotationPoolSize]
	}

	r.pool = filtered

	// Adjust currentIndex if out of bounds
	if len(r.pool) == 0 {
		r.currentIndex = 0
		r.active = nil
	} else {
		if r.currentIndex >= len(r.pool) {
			r.currentIndex = 0
		}
		r.active = r.pool[r.currentIndex]
	}
}

// SetOnSwitch sets the callback for when the active proxy changes
func (r *Rotator) SetOnSwitch(cb func(*models.Proxy)) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.onSwitch = cb
}

// GetPool returns a copy of the current rotation pool
func (r *Rotator) GetPool() []*models.Proxy {
	r.mu.RLock()
	defer r.mu.RUnlock()
	res := make([]*models.Proxy, len(r.pool))
	copy(res, r.pool)
	return res
}

// GetActive returns the currently active proxy
func (r *Rotator) GetActive() *models.Proxy {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.active
}

// GetFilteredCount returns the count of proxies that matched the filters before applying PoolSize limit
func (r *Rotator) GetFilteredCount() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.filteredCount
}

// GetStatus returns the complete state of the rotator
func (r *Rotator) GetStatus() RotationStatus {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return RotationStatus{
		Enabled:       r.config.RotationEnabled,
		PoolSize:      len(r.pool),
		CurrentIndex:  r.currentIndex,
		ActiveProxy:   r.active,
		FilteredCount: r.filteredCount,
	}
}

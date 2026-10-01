package failover

import (
	"fmt"
	"sort"
	"strings"
	"sync"

	"github.com/crrrowz/proxy-redirector-v3/engine/internal/proxy"
	"github.com/crrrowz/proxy-redirector-v3/shared/models"
)

// Handler manages proxy selection and automatic failover.
type Handler struct {
	manager      *proxy.Manager
	currentProxy *models.Proxy
	switchCount  int
	manualLocked bool
	mu           sync.RWMutex
	subscribers  []chan *models.Proxy
	recentIDs    []string
}

// NewHandler creates a new Failover Handler.
func NewHandler(manager *proxy.Manager) *Handler {
	h := &Handler{
		manager:     manager,
		subscribers: make([]chan *models.Proxy, 0),
	}
	h.manager.Rotator().SetOnSwitch(h.OnRotationSwitch)
	return h
}

// OnRotationSwitch is called by the Rotator when it switches proxies.
func (h *Handler) OnRotationSwitch(p *models.Proxy) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.setProxyLocked(p)
}

// Initialize selects the initial best proxy.
func (h *Handler) Initialize() error {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.manager.Config().RotationEnabled {
		best := h.manager.Rotator().Next()
		if best == nil {
			return fmt.Errorf("no alive proxies in rotation pool")
		}
		h.setProxyLocked(best)
		return nil
	}

	if h.manualLocked && h.currentProxy != nil {
		return nil
	}

	best := h.findBestProxy("")
	if best == nil {
		return fmt.Errorf("no alive proxies available")
	}

	h.setProxyLocked(best)
	return nil
}

// CurrentProxy returns the currently active proxy.
func (h *Handler) CurrentProxy() *models.Proxy {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.currentProxy
}

// RefreshBest re-evaluates the pool and switches if a significantly better proxy is found.
// Call this periodically after checking the pool.
func (h *Handler) RefreshBest() error {
	if h.manager.Config().RotationEnabled {
		return nil
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	if h.manualLocked {
		return nil
	}

	best := h.findBestProxy("")
	if best == nil {
		return fmt.Errorf("no alive proxies available")
	}

	// Switch if it's different
	if h.currentProxy == nil || best.ID != h.currentProxy.ID {
		h.setProxyLocked(best)
	}

	return nil
}

// SuggestSwitch suggests switching because the current proxy failed.
func (h *Handler) SuggestSwitch() (*models.Proxy, error) {
	if h.manager.Config().RotationEnabled {
		h.manager.Rotator().Advance()
		p := h.manager.Rotator().Next()
		if p == nil {
			return nil, fmt.Errorf("no alternative alive proxies in pool")
		}
		// Notice: Advance already triggers OnRotationSwitch which will update currentProxy
		// and notify subscribers. But we also return it here.
		return p, nil
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	if h.manualLocked {
		return h.currentProxy, fmt.Errorf("failover is locked to manual selection")
	}

	currentID := ""
	if h.currentProxy != nil {
		currentID = h.currentProxy.ID
	}

	best := h.findBestProxy(currentID) // Exclude current
	if best == nil {
		h.setProxyLocked(nil)
		return nil, fmt.Errorf("no alternative alive proxies available")
	}

	h.setProxyLocked(best)
	return best, nil
}

// ForceSelect manually locks the failover to a specific proxy.
func (h *Handler) ForceSelect(p *models.Proxy) error {
	if p == nil {
		return fmt.Errorf("cannot select nil proxy")
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	h.manualLocked = true
	if h.currentProxy == nil || h.currentProxy.ID != p.ID {
		h.setProxyLocked(p)
	}

	return nil
}

// ClearHistory clears the recent switch history so Auto can pick the absolute best
func (h *Handler) ClearHistory() {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.recentIDs = nil
}

// UnlockAuto unlocks manual selection and resumes automatic failover.
func (h *Handler) UnlockAuto() {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.manualLocked = false
}

// Subscribe returns a channel that receives updates when the proxy switches.
func (h *Handler) Subscribe() <-chan *models.Proxy {
	h.mu.Lock()
	defer h.mu.Unlock()

	ch := make(chan *models.Proxy, 1) // Buffer of 1 so we don't block
	h.subscribers = append(h.subscribers, ch)
	
	// Send current immediately if exists
	if h.currentProxy != nil {
		ch <- h.currentProxy
	}
	
	return ch
}

// SwitchCount returns the number of times the proxy has switched.
func (h *Handler) SwitchCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.switchCount
}

// IsManualLocked returns whether automatic failover is disabled.
func (h *Handler) IsManualLocked() bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.manualLocked
}

// findBestProxy internal helper to find the highest scoring proxy, optionally excluding one.
func (h *Handler) findBestProxy(excludeID string) *models.Proxy {
	alive := h.manager.GetAliveProxies()
	if len(alive) == 0 {
		return nil
	}

	type proxyScore struct {
		p     *models.Proxy
		score float64
	}

	var scores []proxyScore
	for _, p := range alive {
		if p.ID == excludeID {
			continue
		}
		score := h.manager.CalculateScore(p)
		
		// SOCKS proxies get a massive bonus because they reliably support
		// HTTPS tunneling (raw TCP). HTTP proxies often block CONNECT.
		ptype := strings.ToLower(string(p.Type))
		if ptype == "socks5" || ptype == "socks4" {
			score += 50
		}
		
		// Stickiness: Prevent flapping by heavily favoring the current proxy if it's still alive
		if h.currentProxy != nil && p.ID == h.currentProxy.ID {
			score += 1000.0
		}
		
		scores = append(scores, proxyScore{
			p:     p,
			score: score,
		})
	}

	if len(scores) == 0 {
		return nil
	}

	// Sort descending
	sort.Slice(scores, func(i, j int) bool {
		return scores[i].score > scores[j].score
	})

	return scores[0].p
}

// setProxyLocked updates the current proxy and notifies subscribers.
// Caller must hold h.mu lock.
func (h *Handler) setProxyLocked(p *models.Proxy) {
	if h.currentProxy != nil {
		if p == nil || h.currentProxy.ID != p.ID {
			h.switchCount++
			
			// Track recently used proxies to encourage cycling
			h.recentIDs = append(h.recentIDs, h.currentProxy.ID)
			if len(h.recentIDs) > 15 {
				h.recentIDs = h.recentIDs[1:] // keep last 15
			}
		}
	}
	h.currentProxy = p
	h.notifySubscribersLocked(p)
}

// notifySubscribersLocked sends the new proxy to all channels.
// Caller must hold h.mu lock.
func (h *Handler) notifySubscribersLocked(p *models.Proxy) {
	var active []chan *models.Proxy
	for _, ch := range h.subscribers {
		select {
		case ch <- p:
			// Sent successfully
			active = append(active, ch)
		default:
			// Channel is full or blocked, still keep it but clear buffer if possible
			// For a buffer size of 1, we can try to drain and replace
			select {
			case <-ch:
				ch <- p
			default:
			}
			active = append(active, ch)
		}
	}
	h.subscribers = active
}

package proxy

import (
	"net"
	"sync"
	"time"
)

type ConnectedDevice struct {
	IP             string    `json:"ip"`
	Name           string    `json:"name"` // Optional, maybe resolved or just "Unknown Device"
	ConnectedSince time.Time `json:"connected_since"`
	ActiveConns    int       `json:"active_conns"`
	BytesTransfer  int64     `json:"bytes_transfer"` // Optional for later
}

type ClientTracker struct {
	mu         sync.RWMutex
	devices    map[string]*ConnectedDevice
	active     map[net.Conn]string
	blacklisted map[string]time.Time
}

func NewClientTracker() *ClientTracker {
	return &ClientTracker{
		devices:    make(map[string]*ConnectedDevice),
		active:     make(map[net.Conn]string),
		blacklisted: make(map[string]time.Time),
	}
}

// Register adds a new connection
func (t *ClientTracker) Register(conn net.Conn) bool {
	t.mu.Lock()
	defer t.mu.Unlock()

	ip := t.getIP(conn)
	if ip == "127.0.0.1" || ip == "::1" {
		return true // Always allow localhost, don't track it as a remote device
	}

	// Check if blacklisted
	if _, bad := t.blacklisted[ip]; bad {
		return false
	}

	t.active[conn] = ip

	dev, exists := t.devices[ip]
	if !exists {
		dev = &ConnectedDevice{
			IP:             ip,
			Name:           "Device " + ip,
			ConnectedSince: time.Now(),
		}
		t.devices[ip] = dev
	}
	dev.ActiveConns++

	return true
}

// Unregister removes a connection
func (t *ClientTracker) Unregister(conn net.Conn) {
	t.mu.Lock()
	defer t.mu.Unlock()

	ip, exists := t.active[conn]
	if !exists {
		return
	}
	delete(t.active, conn)

	if dev, ok := t.devices[ip]; ok {
		dev.ActiveConns--
		if dev.ActiveConns <= 0 {
			delete(t.devices, ip)
		}
	}
}

// Kick drops all current connections from an IP and blacklists it temporarily
func (t *ClientTracker) Kick(ip string) {
	t.mu.Lock()
	defer t.mu.Unlock()

	t.blacklisted[ip] = time.Now()

	// Close all active connections from this IP
	for conn, connIP := range t.active {
		if connIP == ip {
			conn.Close() // This will cause read/write to fail and Unregister to be called
		}
	}
}

// GetDevices returns a list of connected devices
func (t *ClientTracker) GetDevices() []ConnectedDevice {
	t.mu.RLock()
	defer t.mu.RUnlock()

	var result []ConnectedDevice
	for _, dev := range t.devices {
		result = append(result, *dev)
	}
	return result
}

func (t *ClientTracker) getIP(conn net.Conn) string {
	addr := conn.RemoteAddr().String()
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		return addr
	}
	return host
}

package proxy

import "github.com/crrrowz/proxy-redirector-v3/shared/models"

// InjectTestData injects proxies and statuses directly for testing.
// This is exported so external test packages (e.g. failover, server) can set up
// a Manager without needing file I/O.
func (m *Manager) InjectTestData(proxies []*models.Proxy, statuses map[string]*models.ProxyStatus) {
	m.mu.Lock()
	defer m.mu.Unlock()

	for _, p := range proxies {
		if _, exists := m.byID[p.ID]; !exists {
			m.proxies = append(m.proxies, p)
			m.byID[p.ID] = p
		}
		if st, ok := statuses[p.ID]; ok {
			m.status[p.ID] = st
		} else {
			m.status[p.ID] = &models.ProxyStatus{}
		}
	}
}

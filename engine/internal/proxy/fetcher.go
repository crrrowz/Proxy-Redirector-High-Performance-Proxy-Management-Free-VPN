package proxy

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/crrrowz/proxy-redirector-v3/shared/models"
)

var (
	proxyRegex = regexp.MustCompile(`(?:https?://|socks[45]://)?(\d{1,3}(?:\.\d{1,3}){3}):(\d{1,5})`)
)

type FetchSource struct {
	URL  string
	Type string
}

var defaultSources = []FetchSource{
	{URL: "https://raw.githubusercontent.com/iplocate/free-proxy-list/refs/heads/main/protocols/https.txt", Type: "https"},
	{URL: "https://raw.githubusercontent.com/iplocate/free-proxy-list/refs/heads/main/protocols/http.txt", Type: "http"},
	{URL: "https://raw.githubusercontent.com/iplocate/free-proxy-list/refs/heads/main/protocols/socks4.txt", Type: "socks4"},
	{URL: "https://raw.githubusercontent.com/iplocate/free-proxy-list/refs/heads/main/protocols/socks5.txt", Type: "socks5"},
}

// Fetcher handles scraping proxies from public lists
type Fetcher struct {
	manager  *Manager
	knownIPs sync.Map
}

func NewFetcher(manager *Manager) *Fetcher {
	return &Fetcher{
		manager: manager,
	}
}

func (f *Fetcher) Start(ctx context.Context, intervalSec int) {
	if intervalSec <= 0 {
		intervalSec = 120
	}
	ticker := time.NewTicker(time.Duration(intervalSec) * time.Second)
	defer ticker.Stop()

	// Initial fetch
	f.FetchAll()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			f.FetchAll()
		}
	}
}

func (f *Fetcher) FetchAll() {
	log.Println("[Fetcher] Starting proxy fetch...")
	
	var wg sync.WaitGroup
	var mu sync.Mutex
	var newProxies []models.ProxyEntry

	client := &http.Client{Timeout: 15 * time.Second}

	for _, src := range defaultSources {
		wg.Add(1)
		go func(source FetchSource) {
			defer wg.Done()
			proxies := f.fetchSource(client, source)
			if len(proxies) > 0 {
				mu.Lock()
				newProxies = append(newProxies, proxies...)
				mu.Unlock()
			}
		}(src)
	}

	wg.Wait()

	if len(newProxies) > 0 {
		log.Printf("[Fetcher] Fetched %d new unique proxies. Adding to pool...", len(newProxies))
		f.manager.AddCustomProxies(newProxies)
	} else {
		log.Println("[Fetcher] No new proxies found.")
	}
}

func (f *Fetcher) fetchSource(client *http.Client, source FetchSource) []models.ProxyEntry {
	resp, err := client.Get(source.URL)
	if err != nil {
		log.Printf("[Fetcher] Error fetching %s: %v", source.URL, err)
		return nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return nil
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil
	}

	body := string(bodyBytes)
	lines := strings.Split(body, "\n")
	var results []models.ProxyEntry

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		match := proxyRegex.FindStringSubmatch(line)
		if len(match) == 3 {
			ip := match[1]
			portStr := match[2]
			port, err := strconv.Atoi(portStr)
			if err != nil || port <= 0 || port > 65535 {
				continue
			}

			// Deduplication check
			id := fmt.Sprintf("%s:%d", ip, port)
			if _, exists := f.knownIPs.LoadOrStore(id, true); !exists {
				results = append(results, models.ProxyEntry{
					IP:       ip,
					Port:     port,
					Protocol: source.Type,
					Type:     source.Type,
				})
			}
		}
	}
	return results
}

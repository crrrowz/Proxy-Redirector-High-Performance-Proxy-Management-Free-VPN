package proxy

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/crrrowz/proxy-redirector-v3/engine/internal/config"
	"github.com/crrrowz/proxy-redirector-v3/shared/models"
	"golang.org/x/net/proxy"
)

// CheckConfig is a subset of config needed for checking
type CheckConfig struct {
	TimeoutSeconds  int
	MaxConcurrent   int
	CheckURL        string
	HTTPSCheckURL   string
	AnonymityCheck  bool
	SSLCheckEnabled bool
	MaxSpeedMs      int
	RealIP          string
}

// ConfigToCheckConfig converts engine Config to CheckConfig
func ConfigToCheckConfig(cfg *config.Config) *CheckConfig {
	return &CheckConfig{
		TimeoutSeconds:  cfg.CheckTimeoutSec,
		MaxConcurrent:   cfg.MaxConcurrentChecks,
		CheckURL:        cfg.CheckURL,
		HTTPSCheckURL:   cfg.HTTPSCheckURL,
		AnonymityCheck:  cfg.AnonymityCheck,
		SSLCheckEnabled: cfg.SSLCheckEnabled,
		MaxSpeedMs:      cfg.MaxSpeedMs,
		RealIP:          cfg.RealIP,
	}
}

// DetectRealIP finds the user's real public IP to check for proxy anonymity.
func DetectRealIP(ctx context.Context) (string, error) {
	client := &http.Client{Timeout: 5 * time.Second}
	req, err := http.NewRequestWithContext(ctx, "GET", "http://httpbin.org/ip", nil)
	if err != nil {
		return "", err
	}

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result struct {
		Origin string `json:"origin"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	// Sometimes httpbin returns multiple IPs separated by commas
	ips := strings.Split(result.Origin, ",")
	if len(ips) > 0 {
		return strings.TrimSpace(ips[0]), nil
	}
	return "", fmt.Errorf("empty origin from httpbin")
}

// CheckSingle checks a single proxy for liveness, speed, anonymity, and SSL.
func CheckSingle(ctx context.Context, p *models.Proxy, cfg *CheckConfig) *models.CheckResult {
	id := p.ID
	if id == "" {
		id = p.GenerateID()
	}

	result := &models.CheckResult{
		ID:    id,
		Alive: false,
	}

	timeout := time.Duration(cfg.TimeoutSeconds) * time.Second
	dialerCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	var httpTransport *http.Transport

	// Forward dialer with timeout — prevents goroutines from hanging on unreachable proxies
	forwardDialer := &net.Dialer{Timeout: timeout}

	// Setup dialer based on proxy type
	address := fmt.Sprintf("%s:%d", p.IP, p.Port)
	ptype := strings.ToLower(string(p.Type))

	switch ptype {
	case "socks5", "socks4":
		var auth *proxy.Auth
		if p.Username != "" {
			auth = &proxy.Auth{User: p.Username, Password: p.Password}
		}
		socksDialer, err := proxy.SOCKS5("tcp", address, auth, forwardDialer)
		if err != nil {
			result.Error = fmt.Sprintf("socks5 setup error: %v", err)
			return result
		}
		httpTransport = &http.Transport{
			DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
				// Use a channel to make the dial cancellable via context
				type dialResult struct {
					conn net.Conn
					err  error
				}
				ch := make(chan dialResult, 1)
				go func() {
					conn, err := socksDialer.Dial(network, addr)
					ch <- dialResult{conn, err}
				}()
				select {
				case <-ctx.Done():
					return nil, ctx.Err()
				case r := <-ch:
					return r.conn, r.err
				}
			},
		}

	case "http", "https":
		// For HTTP/HTTPS, we use http.ProxyURL
		proxyURL := "http://"
		if p.Username != "" {
			proxyURL += fmt.Sprintf("%s:%s@", p.Username, p.Password)
		}
		proxyURL += address
		
		httpTransport = &http.Transport{
			Proxy:       http.ProxyURL(mustParseURL(proxyURL)),
			DialContext: forwardDialer.DialContext,
		}
	default:
		result.Error = fmt.Sprintf("unsupported proxy type: %s", p.Type)
		return result
	}

	// 1. HTTP Check & Speed Measurement
	client := &http.Client{
		Transport: httpTransport,
		Timeout:   timeout,
	}

	req, err := http.NewRequestWithContext(dialerCtx, "GET", cfg.CheckURL, nil)
	if err != nil {
		result.Error = err.Error()
		return result
	}

	start := time.Now()
	resp, err := client.Do(req)
	elapsed := time.Since(start).Milliseconds()

	if err != nil {
		result.Error = fmt.Sprintf("http check failed: %v", err)
		return result
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		result.Error = fmt.Sprintf("bad status code: %d", resp.StatusCode)
		return result
	}

	// Read body to get IP
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		result.Error = fmt.Sprintf("failed to read body: %v", err)
		return result
	}

	var jsonResp struct {
		Origin string `json:"origin"`
	}
	if err := json.Unmarshal(bodyBytes, &jsonResp); err != nil {
		result.Error = "invalid json response"
		return result
	}

	// 2. Anonymity Check
	if cfg.AnonymityCheck && cfg.RealIP != "" {
		if strings.Contains(jsonResp.Origin, cfg.RealIP) {
			result.Error = "transparent proxy (leaks real IP)"
			return result
		}
	}

	// 3. Speed Check Threshold
	if cfg.MaxSpeedMs > 0 && int(elapsed) > cfg.MaxSpeedMs {
		result.Error = fmt.Sprintf("too slow: %dms > %dms", elapsed, cfg.MaxSpeedMs)
		return result
	}

	// Passed HTTP checks
	result.Alive = true
	result.ResponseTimeMs = float64(elapsed)

	if p.Country == "" || p.Country == "Unknown" {
		result.Country = LookupCountry(ctx, p.IP)
	} else {
		result.Country = p.Country
	}

	// 4. SSL Check
	if strings.HasPrefix(strings.ToLower(cfg.CheckURL), "https://") {
		// If primary check was HTTPS, it's already SSL verified!
		result.SSLVerified = true
	} else if cfg.SSLCheckEnabled {
		sslCtx, sslCancel := context.WithTimeout(ctx, timeout)
		defer sslCancel()
		
		sslReq, err := http.NewRequestWithContext(sslCtx, "GET", cfg.HTTPSCheckURL, nil)
		if err == nil {
			// Enforce strict certificate verification
			sslClient := &http.Client{Transport: httpTransport, Timeout: timeout}
			
			sslResp, sslErr := sslClient.Do(sslReq)
			if sslErr != nil {
				// SSL Verification failed or MITM detected, but proxy is still HTTP-alive
				result.SSLVerified = false
			} else {
				sslResp.Body.Close()
				if sslResp.StatusCode == http.StatusOK {
					result.SSLVerified = true
				}
			}
		}
	}

	return result
}

// LookupCountry retrieves the country code for an IP using ip-api.com
func LookupCountry(ctx context.Context, ip string) string {
	client := &http.Client{Timeout: 3 * time.Second}
	req, err := http.NewRequestWithContext(ctx, "GET", "http://ip-api.com/json/"+ip+"?fields=countryCode", nil)
	if err != nil {
		return "Unknown"
	}
	
	resp, err := client.Do(req)
	if err != nil {
		return "Unknown"
	}
	defer resp.Body.Close()
	
	if resp.StatusCode != 200 {
		return "Unknown"
	}
	
	var data struct {
		CountryCode string `json:"countryCode"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return "Unknown"
	}
	
	if data.CountryCode != "" {
		return data.CountryCode
	}
	return "Unknown"
}

// CheckBatch checks a list of proxies concurrently with a concurrency limit.
func CheckBatch(ctx context.Context, proxies []*models.Proxy, cfg *CheckConfig) []*models.CheckResult {
	if len(proxies) == 0 {
		return nil
	}

	maxConcurrent := cfg.MaxConcurrent
	if maxConcurrent <= 0 {
		maxConcurrent = 50
	}

	semaphore := make(chan struct{}, maxConcurrent)
	results := make([]*models.CheckResult, len(proxies))
	var wg sync.WaitGroup

	for i, p := range proxies {
		wg.Add(1)
		go func(index int, prx *models.Proxy) {
			defer wg.Done()
			
			// Acquire semaphore
			semaphore <- struct{}{}
			
			res := CheckSingle(ctx, prx, cfg)
			results[index] = res
			
			// Release semaphore
			<-semaphore
		}(i, p)
	}

	wg.Wait()
	
	// Diagnostic logging
	alive, dead := 0, 0
	var errors []string
	for _, r := range results {
		if r == nil {
			continue
		}
		if r.Alive {
			alive++
			log.Printf("[Checker] ✓ ALIVE: %s (%.0fms, SSL=%v)", r.ID, r.ResponseTimeMs, r.SSLVerified)
		} else {
			dead++
			if len(errors) < 5 {
				errors = append(errors, fmt.Sprintf("%s: %s", r.ID, r.Error))
			}
		}
	}
	log.Printf("[Checker] Batch result: %d alive / %d dead out of %d checked", alive, dead, len(proxies))
	if alive == 0 && len(errors) > 0 {
		log.Printf("[Checker] Sample errors: %v", errors)
	}
	
	return results
}

// FindAlive checks proxies in batches until it finds the requested number of alive proxies.
func FindAlive(ctx context.Context, proxies []*models.Proxy, needed int, cfg *CheckConfig) []*models.CheckResult {
	var aliveResults []*models.CheckResult
	
	batchSize := cfg.MaxConcurrent
	if batchSize <= 0 {
		batchSize = 50
	}

	for i := 0; i < len(proxies); i += batchSize {
		end := i + batchSize
		if end > len(proxies) {
			end = len(proxies)
		}

		batch := proxies[i:end]
		batchResults := CheckBatch(ctx, batch, cfg)

		for _, res := range batchResults {
			if res.Alive {
				aliveResults = append(aliveResults, res)
				if len(aliveResults) >= needed {
					return aliveResults
				}
			}
		}
		
		// Check context cancellation
		select {
		case <-ctx.Done():
			return aliveResults
		default:
		}
	}

	return aliveResults
}

// RecheckAlive rechecks a list of currently alive proxies.
func RecheckAlive(ctx context.Context, proxies []*models.Proxy, cfg *CheckConfig) []*models.CheckResult {
	return CheckBatch(ctx, proxies, cfg)
}

// mustParseURL is a helper to parse URL without error returning
func mustParseURL(raw string) *url.URL {
	u, _ := url.Parse(raw)
	return u
}

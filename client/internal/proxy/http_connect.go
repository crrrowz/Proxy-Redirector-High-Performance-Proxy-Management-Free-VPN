package proxy

import (
	"bufio"
	"encoding/base64"
	"fmt"
	"net"
	"net/http"
	"time"

	"github.com/crrrowz/proxy-redirector-v3/shared/models"
)

// dialHTTPConnect establishes a TCP connection through an HTTP proxy using
// the CONNECT method. This is the standard way to tunnel arbitrary TCP
// traffic (including TLS/HTTPS) through an HTTP proxy.
func dialHTTPConnect(p *models.Proxy, targetAddr string) (net.Conn, error) {
	// 1. Connect to the proxy server itself
	proxyConn, err := net.DialTimeout("tcp", p.Address(), 10*time.Second)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to HTTP proxy %s: %w", p.Address(), err)
	}

	// 2. Send CONNECT request
	connectReq := fmt.Sprintf("CONNECT %s HTTP/1.1\r\nHost: %s\r\n", targetAddr, targetAddr)

	// Add proxy authentication if needed
	if p.Username != "" {
		credentials := base64.StdEncoding.EncodeToString([]byte(p.Username + ":" + p.Password))
		connectReq += fmt.Sprintf("Proxy-Authorization: Basic %s\r\n", credentials)
	}

	connectReq += "\r\n"

	if _, err := proxyConn.Write([]byte(connectReq)); err != nil {
		proxyConn.Close()
		return nil, fmt.Errorf("failed to send CONNECT to proxy: %w", err)
	}

	// 3. Read the response
	resp, err := http.ReadResponse(bufio.NewReader(proxyConn), nil)
	if err != nil {
		proxyConn.Close()
		return nil, fmt.Errorf("failed to read CONNECT response: %w", err)
	}
	resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		proxyConn.Close()
		return nil, fmt.Errorf("HTTP CONNECT failed with status: %s", resp.Status)
	}

	// 4. The connection is now tunneled — return the raw TCP conn
	return proxyConn, nil
}

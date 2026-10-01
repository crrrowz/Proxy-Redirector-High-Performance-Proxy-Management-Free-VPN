package proxy

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"strings"

	"github.com/crrrowz/proxy-redirector-v3/client/internal/engine"
	"github.com/crrrowz/proxy-redirector-v3/shared/models"
	goproxy "golang.org/x/net/proxy"
)

// HTTPProxyServer handles incoming HTTP/HTTPS proxy connections from local apps.
type HTTPProxyServer struct {
	port       int
	engineCtrl *engine.GRPCClient
	listener   net.Listener
	enabled    bool
	tracker    *ClientTracker
}

// NewHTTPProxyServer creates a new HTTP proxy server instance.
func NewHTTPProxyServer(port int, engineCtrl *engine.GRPCClient, tracker *ClientTracker) *HTTPProxyServer {
	return &HTTPProxyServer{
		port:       port,
		engineCtrl: engineCtrl,
		enabled:    true,
		tracker:    tracker,
	}
}

// Enable toggles the server's ability to accept connections
func (s *HTTPProxyServer) Enable(enabled bool) {
	s.enabled = enabled
}

// Start begins listening for HTTP proxy connections.
func (s *HTTPProxyServer) Start() error {
	addr := fmt.Sprintf("0.0.0.0:%d", s.port) // Changed to 0.0.0.0 for LAN sharing
	l, err := net.Listen("tcp", addr)
	if err != nil {
		return err
	}
	s.listener = l
	log.Printf("[HTTP Proxy] Listening on %s", addr)

	for {
		conn, err := l.Accept()
		if err != nil {
			if strings.Contains(err.Error(), "use of closed network connection") {
				break
			}
			log.Printf("[HTTP Proxy] Accept error: %v", err)
			continue
		}
		
		if !s.enabled {
			conn.Close()
			continue
		}
		
		if s.tracker != nil && !s.tracker.Register(conn) {
			conn.Close()
			continue
		}
		
		go func(c net.Conn) {
			defer func() {
				if s.tracker != nil {
					s.tracker.Unregister(c)
				}
			}()
			s.handleConnection(c)
		}(conn)
	}
	return nil
}

// Stop stops the server.
func (s *HTTPProxyServer) Stop() {
	if s.listener != nil {
		s.listener.Close()
	}
}

func (s *HTTPProxyServer) handleConnection(conn net.Conn) {
	defer conn.Close()

	reader := bufio.NewReader(conn)
	req, err := http.ReadRequest(reader)
	if err != nil {
		log.Printf("[HTTP Proxy] Failed to read request: %v", err)
		return
	}

	// 1. Handle CONNECT (HTTPS) or Standard HTTP
	if req.Method == http.MethodConnect {
		s.handleHTTPS(conn, req)
	} else {
		s.handleHTTP(conn, req)
	}
}

func (s *HTTPProxyServer) handleHTTPS(clientConn net.Conn, req *http.Request) {
	var targetConn net.Conn
	var lastErr error
	maxRetries := 10

	for attempt := 0; attempt < maxRetries; attempt++ {
		p, err := s.engineCtrl.GetActiveProxy(context.Background())
		if err != nil {
			log.Printf("[HTTP Proxy] Failed to get active proxy from engine: %v", err)
			httpError(clientConn, http.StatusServiceUnavailable, "Engine unavailable")
			return
		}

		tConn, err := s.dialViaProxy(p, req.Host)
		if err == nil {
			targetConn = tConn
			break
		}

		lastErr = err
		log.Printf("[HTTP Proxy] [Attempt %d] Failed to connect to %s via proxy %s: %v", attempt+1, req.Host, p.Address(), err)
		s.engineCtrl.ReportFailure(context.Background(), p.ID)
	}

	if targetConn == nil {
		log.Printf("[HTTP Proxy] Exhausted all %d attempts to reach %s. Last error: %v", maxRetries, req.Host, lastErr)
		httpError(clientConn, http.StatusBadGateway, "Failed to reach target via proxy")
		return
	}
	defer targetConn.Close()

	// Send 200 Connection Established
	clientConn.Write([]byte("HTTP/1.1 200 Connection Established\r\n\r\n"))

	// Tunnel traffic
	errc := make(chan error, 2)
	go func() {
		_, err := io.Copy(targetConn, clientConn)
		errc <- err
	}()
	go func() {
		_, err := io.Copy(clientConn, targetConn)
		errc <- err
	}()
	<-errc
}

func (s *HTTPProxyServer) handleHTTP(clientConn net.Conn, req *http.Request) {
	var targetConn net.Conn
	var lastErr error
	maxRetries := 10

	for attempt := 0; attempt < maxRetries; attempt++ {
		p, err := s.engineCtrl.GetActiveProxy(context.Background())
		if err != nil {
			log.Printf("[HTTP Proxy] Failed to get active proxy from engine: %v", err)
			httpError(clientConn, http.StatusServiceUnavailable, "Engine unavailable")
			return
		}

		tConn, err := s.dialViaProxy(p, req.Host)
		if err != nil && !strings.Contains(req.Host, ":") {
			// If port is missing in HTTP requests, default to 80
			tConn, err = s.dialViaProxy(p, req.Host+":80")
		}

		if err == nil {
			targetConn = tConn
			break
		}

		lastErr = err
		log.Printf("[HTTP Proxy] [Attempt %d] Failed to connect to %s via proxy %s: %v", attempt+1, req.Host, p.Address(), err)
		s.engineCtrl.ReportFailure(context.Background(), p.ID)
	}

	if targetConn == nil {
		log.Printf("[HTTP Proxy] Exhausted all %d attempts to reach %s. Last error: %v", maxRetries, req.Host, lastErr)
		httpError(clientConn, http.StatusBadGateway, "Failed to reach target via proxy")
		return
	}
	defer targetConn.Close()

	// Forward the request to the target
	if err := req.Write(targetConn); err != nil {
		log.Printf("[HTTP Proxy] Failed to forward request: %v", err)
		return
	}

	// Read response and send back to client
	io.Copy(clientConn, targetConn)
}

func (s *HTTPProxyServer) dialViaProxy(p *models.Proxy, targetAddr string) (net.Conn, error) {
	ptype := strings.ToLower(string(p.Type))
	
	switch ptype {
	case "socks5", "socks4":
		var auth *goproxy.Auth
		if p.Username != "" {
			auth = &goproxy.Auth{User: p.Username, Password: p.Password}
		}
		dialer, err := goproxy.SOCKS5("tcp", p.Address(), auth, goproxy.Direct)
		if err != nil {
			return nil, err
		}
		return dialer.Dial("tcp", targetAddr)
	
	case "http", "https":
		return dialHTTPConnect(p, targetAddr)
	
	default:
		return nil, fmt.Errorf("unsupported proxy type for HTTP proxy local server: %s", p.Type)
	}
}

func httpError(conn net.Conn, status int, msg string) {
	resp := fmt.Sprintf("HTTP/1.1 %d %s\r\nContent-Type: text/plain\r\n\r\n%s", status, http.StatusText(status), msg)
	conn.Write([]byte(resp))
}

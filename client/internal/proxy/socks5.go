package proxy

import (
	"context"
	"encoding/binary"
	"fmt"
	"io"
	"log"
	"net"
	"strings"

	"github.com/crrrowz/proxy-redirector-v3/client/internal/engine"
	"github.com/crrrowz/proxy-redirector-v3/shared/models"
	goproxy "golang.org/x/net/proxy"
)

type SOCKS5Server struct {
	port       int
	engineCtrl *engine.GRPCClient
	listener   net.Listener
	enabled    bool
	tracker    *ClientTracker
}

// NewSOCKS5Server creates a new SOCKS5 server instance.
func NewSOCKS5Server(port int, engineCtrl *engine.GRPCClient, tracker *ClientTracker) *SOCKS5Server {
	return &SOCKS5Server{
		port:       port,
		engineCtrl: engineCtrl,
		enabled:    true, // defaults to true for backward compatibility
		tracker:    tracker,
	}
}

// Enable toggles the server's ability to accept connections
func (s *SOCKS5Server) Enable(enabled bool) {
	s.enabled = enabled
}

// Start begins listening for SOCKS5 connections.
func (s *SOCKS5Server) Start() error {
	addr := fmt.Sprintf("0.0.0.0:%d", s.port) // Changed to 0.0.0.0 for LAN sharing
	l, err := net.Listen("tcp", addr)
	if err != nil {
		return err
	}
	s.listener = l
	log.Printf("[SOCKS5] Listening on %s", addr)

	for {
		conn, err := l.Accept()
		if err != nil {
			if strings.Contains(err.Error(), "use of closed network connection") {
				break
			}
			log.Printf("[SOCKS5] Accept error: %v", err)
			continue
		}
		
		if !s.enabled {
			conn.Close()
			continue
		}
		
		if s.tracker != nil && !s.tracker.Register(conn) {
			conn.Close() // Blocked
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
func (s *SOCKS5Server) Stop() {
	if s.listener != nil {
		s.listener.Close()
	}
}

func (s *SOCKS5Server) handleConnection(conn net.Conn) {
	defer conn.Close()

	// 1. Handshake
	if err := s.handshake(conn); err != nil {
		log.Printf("[SOCKS5] Handshake error: %v", err)
		return
	}

	// 2. Read Request
	targetAddr, err := s.readRequest(conn)
	if err != nil {
		log.Printf("[SOCKS5] Request error: %v", err)
		return
	}

	// 3 & 4. Seamless Retry Loop for Proxy Dialing
	var targetConn net.Conn
	var lastErr error
	maxRetries := 10

	for attempt := 0; attempt < maxRetries; attempt++ {
		activeProxy, err := s.engineCtrl.GetActiveProxy(context.Background())
		if err != nil {
			log.Printf("[SOCKS5] Failed to get active proxy from engine: %v", err)
			s.sendReply(conn, 0x01) // general server failure
			return
		}

		tConn, err := s.dialViaProxy(activeProxy, targetAddr)
		if err == nil {
			targetConn = tConn
			break // Success!
		}

		lastErr = err
		log.Printf("[SOCKS5] [Attempt %d] Failed to connect to %s via proxy %s: %v", attempt+1, targetAddr, activeProxy.Address(), err)
		
		// Tell the engine this proxy failed so it can switch immediately
		s.engineCtrl.ReportFailure(context.Background(), activeProxy.ID)
	}

	if targetConn == nil {
		log.Printf("[SOCKS5] Exhausted all %d attempts to reach %s. Last error: %v", maxRetries, targetAddr, lastErr)
		s.sendReply(conn, 0x04) // Host unreachable
		return
	}
	defer targetConn.Close()

	// 5. Send Success Reply
	if err := s.sendReply(conn, 0x00); err != nil {
		log.Printf("[SOCKS5] Failed to send success reply: %v", err)
		return
	}

	// 6. Tunnel Traffic
	errc := make(chan error, 2)
	go func() {
		_, err := io.Copy(targetConn, conn)
		errc <- err
	}()
	go func() {
		_, err := io.Copy(conn, targetConn)
		errc <- err
	}()
	<-errc
}

func (s *SOCKS5Server) handshake(conn net.Conn) error {
	buf := make([]byte, 2)
	if _, err := io.ReadFull(conn, buf); err != nil {
		return err
	}
	if buf[0] != 0x05 {
		return fmt.Errorf("unsupported SOCKS version: %x", buf[0])
	}
	numMethods := int(buf[1])
	methods := make([]byte, numMethods)
	if _, err := io.ReadFull(conn, methods); err != nil {
		return err
	}

	// Reply: No Authentication Required
	_, err := conn.Write([]byte{0x05, 0x00})
	return err
}

func (s *SOCKS5Server) readRequest(conn net.Conn) (string, error) {
	buf := make([]byte, 4)
	if _, err := io.ReadFull(conn, buf); err != nil {
		return "", err
	}
	if buf[0] != 0x05 || buf[1] != 0x01 { // Version 5, CONNECT command
		return "", fmt.Errorf("unsupported command: %x", buf[1])
	}

	var host string
	switch buf[3] {
	case 0x01: // IPv4
		ipBuf := make([]byte, 4)
		if _, err := io.ReadFull(conn, ipBuf); err != nil {
			return "", err
		}
		host = net.IP(ipBuf).String()
	case 0x03: // Domain
		domainLenBuf := make([]byte, 1)
		if _, err := io.ReadFull(conn, domainLenBuf); err != nil {
			return "", err
		}
		domainBuf := make([]byte, int(domainLenBuf[0]))
		if _, err := io.ReadFull(conn, domainBuf); err != nil {
			return "", err
		}
		host = string(domainBuf)
	case 0x04: // IPv6
		ipBuf := make([]byte, 16)
		if _, err := io.ReadFull(conn, ipBuf); err != nil {
			return "", err
		}
		host = net.IP(ipBuf).String()
	default:
		return "", fmt.Errorf("unsupported address type: %x", buf[3])
	}

	portBuf := make([]byte, 2)
	if _, err := io.ReadFull(conn, portBuf); err != nil {
		return "", err
	}
	port := binary.BigEndian.Uint16(portBuf)

	return fmt.Sprintf("%s:%d", host, port), nil
}

func (s *SOCKS5Server) sendReply(conn net.Conn, rep byte) error {
	// Standard IPv4 reply 0.0.0.0:0
	reply := []byte{0x05, rep, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00}
	_, err := conn.Write(reply)
	return err
}

func (s *SOCKS5Server) dialViaProxy(p *models.Proxy, targetAddr string) (net.Conn, error) {
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
		return nil, fmt.Errorf("unsupported proxy type: %s", p.Type)
	}
}

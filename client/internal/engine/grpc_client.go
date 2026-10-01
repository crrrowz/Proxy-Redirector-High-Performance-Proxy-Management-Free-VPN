package engine

import (
	"context"
	"fmt"
	"log"
	"time"

	pb "github.com/crrrowz/proxy-redirector-v3/shared/pb"
	"github.com/crrrowz/proxy-redirector-v3/shared/models"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"encoding/base64"
)

type basicAuth struct {
	username string
	password string
}

func (b basicAuth) GetRequestMetadata(ctx context.Context, in ...string) (map[string]string, error) {
	auth := b.username + ":" + b.password
	enc := base64.StdEncoding.EncodeToString([]byte(auth))
	return map[string]string{
		"authorization": "Basic " + enc,
	}, nil
}

func (basicAuth) RequireTransportSecurity() bool {
	return false
}

// GRPCClient manages the connection to the Engine.
type GRPCClient struct {
	address  string
	username string
	password string
	Conn     *grpc.ClientConn
	Client   pb.ProxyEngineClient
}

// NewGRPCClient initializes a new gRPC client.
func NewGRPCClient(address, username, password string) *GRPCClient {
	return &GRPCClient{
		address:  address,
		username: username,
		password: password,
	}
}

// Connect establishes the connection to the Engine.
func (c *GRPCClient) Connect(ctx context.Context) error {
	log.Printf("[Client] Connecting to Engine at %s...", c.address)
	
	opts := []grpc.DialOption{
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	}

	if c.username != "" || c.password != "" {
		opts = append(opts, grpc.WithPerRPCCredentials(basicAuth{
			username: c.username,
			password: c.password,
		}))
	}

	conn, err := grpc.NewClient(c.address, opts...)
	if err != nil {
		return fmt.Errorf("failed to connect to engine: %w", err)
	}

	c.Conn = conn
	c.Client = pb.NewProxyEngineClient(conn)
	
	// Test the connection
	_, err = c.Client.Connect(ctx, &pb.ConnectRequest{})
	if err != nil {
		log.Printf("[Client] Engine is currently offline. Will auto-connect when it starts.")
		// Do NOT close the connection. gRPC will automatically reconnect in the background!
	} else {
		log.Println("[Client] Successfully connected to Engine!")
	}

	return nil
}

// Disconnect closes the connection.
func (c *GRPCClient) Disconnect() {
	if c.Conn != nil {
		c.Conn.Close()
		c.Conn = nil
		c.Client = nil
	}
}

// Reconnect disconnects and re-establishes the gRPC connection with new parameters.
func (c *GRPCClient) Reconnect(address, username, password string) error {
	c.Disconnect()
	c.address = address
	c.username = username
	c.password = password
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	return c.Connect(ctx)
}

// GetActiveProxy retrieves the best active proxy from the Engine.
func (c *GRPCClient) GetActiveProxy(ctx context.Context) (*models.Proxy, error) {
	if c.Client == nil {
		return nil, fmt.Errorf("not connected")
	}

	req := &pb.Empty{}
	resp, err := c.Client.GetActiveProxy(ctx, req)
	if err != nil {
		return nil, err
	}

	if resp == nil {
		return nil, fmt.Errorf("engine returned no active proxy")
	}
	
	// Convert pb.ProxyProtocol to string format
	var pType models.ProxyType
	switch resp.Protocol {
	case pb.ProxyProtocol_PROXY_PROTOCOL_SOCKS5: pType = models.ProxyHTTP // Wait, SOCKS5 is just a string, let's use the models.ProxyType constants. Ah, wait, in models it is "socks5".
		pType = models.ProxyType("socks5")
	case pb.ProxyProtocol_PROXY_PROTOCOL_SOCKS4: pType = models.ProxyType("socks4")
	case pb.ProxyProtocol_PROXY_PROTOCOL_HTTP: pType = models.ProxyType("http")
	case pb.ProxyProtocol_PROXY_PROTOCOL_HTTPS: pType = models.ProxyType("https")
	default: pType = models.ProxyType("socks5")
	}

	p := &models.Proxy{
		ID:       resp.Id,
		IP:       resp.Ip,
		Port:     int(resp.Port),
		Type:     pType,
		Username: resp.Username,
		Password: resp.Password,
		Country:  resp.Country,
		City:     resp.City,
		Ping:     resp.SpeedMs,
	}

	return p, nil
}

// GetEngineStatus retrieves the overall status of the Engine.
func (c *GRPCClient) GetEngineStatus(ctx context.Context) (*pb.EngineStatus, error) {
	if c.Client == nil {
		return nil, fmt.Errorf("not connected")
	}

	req := &pb.Empty{}
	return c.Client.GetEngineStatus(ctx, req)
}

// GetProxies retrieves a list of proxies matching the criteria.
func (c *GRPCClient) GetProxies(ctx context.Context, limit int32, country string) ([]*models.Proxy, error) {
	if c.Client == nil {
		return nil, fmt.Errorf("not connected")
	}
	
	req := &pb.GetProxiesRequest{
		Limit: limit,
		CountryFilter: country,
	}
	resp, err := c.Client.GetProxies(ctx, req)
	if err != nil {
		return nil, err
	}
	
	var list []*models.Proxy
	for _, rp := range resp.Proxies {
		var pType models.ProxyType
		switch rp.Protocol {
		case pb.ProxyProtocol_PROXY_PROTOCOL_SOCKS5: pType = models.ProxyType("socks5")
		case pb.ProxyProtocol_PROXY_PROTOCOL_SOCKS4: pType = models.ProxyType("socks4")
		case pb.ProxyProtocol_PROXY_PROTOCOL_HTTP: pType = models.ProxyType("http")
		case pb.ProxyProtocol_PROXY_PROTOCOL_HTTPS: pType = models.ProxyType("https")
		default: pType = models.ProxyType("socks5")
		}
		
		list = append(list, &models.Proxy{
			ID:       rp.Id,
			IP:       rp.Ip,
			Port:     int(rp.Port),
			Type:     pType,
			Username: rp.Username,
			Password: rp.Password,
			Country:  rp.Country,
			City:     rp.City,
			Ping:     rp.SpeedMs, // Assuming SpeedMs is mapped to Ping in the frontend if needed
		})
	}
	return list, nil
}

// ForceSwitch tells the engine to force a switch to another proxy
func (c *GRPCClient) ForceSwitch(ctx context.Context) error {
	if c.Client == nil {
		return fmt.Errorf("not connected")
	}
	_, err := c.Client.Disconnect(ctx, &pb.DisconnectRequest{SessionId: "switch"})
	return err
}

// ReportFailure tells the engine that the specified proxy is dead.
func (c *GRPCClient) ReportFailure(ctx context.Context, proxyID string) {
	if c.Client != nil {
		c.Client.Disconnect(ctx, &pb.DisconnectRequest{SessionId: "fail_" + proxyID})
	}
}

// UpdateConfig updates engine configuration (e.g., CountryFilter).
func (c *GRPCClient) UpdateConfig(ctx context.Context, updates map[string]string) error {
	if c.Client == nil {
		return fmt.Errorf("not connected")
	}
	_, err := c.Client.UpdateConfig(ctx, &pb.ConfigUpdateRequest{
		Updates: updates,
	})
	return err
}

// GetRotationStatus gets the current rotation engine status
func (c *GRPCClient) GetRotationStatus(ctx context.Context) (*pb.RotationStatus, error) {
	if c.Client == nil {
		return nil, fmt.Errorf("not connected")
	}
	return c.Client.GetRotationStatus(ctx, &pb.Empty{})
}

// GetRotationPool gets the current proxies in the rotation pool
func (c *GRPCClient) GetRotationPool(ctx context.Context) (*pb.RotationPoolResponse, error) {
	if c.Client == nil {
		return nil, fmt.Errorf("not connected")
	}
	return c.Client.GetRotationPool(ctx, &pb.Empty{})
}

// EnableRotation turns on proxy rotation
func (c *GRPCClient) EnableRotation(ctx context.Context, interval int, types []string, country string, maxSpeed int, poolSize int, sslOnly bool) error {
	if c.Client == nil {
		return fmt.Errorf("not connected")
	}
	_, err := c.Client.EnableRotation(ctx, &pb.RotationConfig{
		IntervalSec:   int32(interval),
		ProxyTypes:    types,
		CountryFilter: country,
		MaxSpeedMs:    int32(maxSpeed),
		PoolSize:      int32(poolSize),
		SslOnly:       sslOnly,
	})
	return err
}

// DisableRotation turns off proxy rotation
func (c *GRPCClient) DisableRotation(ctx context.Context) error {
	if c.Client == nil {
		return fmt.Errorf("not connected")
	}
	_, err := c.Client.DisableRotation(ctx, &pb.Empty{})
	return err
}

// GetBlockStats retrieves adblock statistics from the engine.
func (c *GRPCClient) GetBlockStats(ctx context.Context) (*pb.BlockStats, error) {
	if c.Client == nil {
		return nil, fmt.Errorf("not connected")
	}
	return c.Client.GetBlockStats(ctx, &pb.Empty{})
}

// ToggleAdBlock enables or disables adblock in the engine.
func (c *GRPCClient) ToggleAdBlock(ctx context.Context, enabled bool) error {
	if c.Client == nil {
		return fmt.Errorf("not connected")
	}
	_, err := c.Client.ToggleAdBlock(ctx, &pb.ToggleRequest{
		Category: "all",
		Enabled:  enabled,
	})
	return err
}

// CheckDomain checks if a domain is blocked by adblock.
func (c *GRPCClient) CheckDomain(ctx context.Context, domain string) (*pb.DomainCheckResponse, error) {
	if c.Client == nil {
		return nil, fmt.Errorf("not connected")
	}
	return c.Client.CheckDomain(ctx, &pb.DomainCheckRequest{
		Domain: domain,
	})
}

// GetConfig retrieves the current engine configuration map.
func (c *GRPCClient) GetConfig(ctx context.Context) (map[string]string, error) {
	if c.Client == nil {
		return nil, fmt.Errorf("not connected")
	}
	resp, err := c.Client.GetConfig(ctx, &pb.Empty{})
	if err != nil {
		return nil, err
	}
	return resp.Config, nil
}

// GetPoolSummary gets the proxy pool summary statistics.
func (c *GRPCClient) GetPoolSummary(ctx context.Context) (*pb.PoolSummary, error) {
	if c.Client == nil {
		return nil, fmt.Errorf("not connected")
	}
	return c.Client.GetPoolSummary(ctx, &pb.Empty{})
}


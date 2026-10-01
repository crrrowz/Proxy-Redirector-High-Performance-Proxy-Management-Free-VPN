package server

import (
	"context"
	"fmt"
	"log"
	"net"
	"sort"
	"strings"
	"sync"

	"github.com/crrrowz/proxy-redirector-v3/engine/internal/adblock"
	"github.com/crrrowz/proxy-redirector-v3/engine/internal/config"
	"github.com/crrrowz/proxy-redirector-v3/engine/internal/failover"
	"github.com/crrrowz/proxy-redirector-v3/engine/internal/proxy"
	pb "github.com/crrrowz/proxy-redirector-v3/engine/internal/server/pb"
	"github.com/crrrowz/proxy-redirector-v3/shared/models"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/reflection"
	"google.golang.org/grpc/status"
	"encoding/base64"
)

// GRPCServer handles communication with the client application.
type GRPCServer struct {
	pb.UnimplementedProxyEngineServer
	manager      *proxy.Manager
	failover     *failover.Handler
	adblock      *adblock.Engine
	config       *config.Config
	grpcSrv      *grpc.Server
	isRunning    bool
	mu           sync.RWMutex
	
	// Channels to notify streaming clients
	updateChan   chan *pb.ProxyUpdate
}

// NewGRPCServer initializes the gRPC server.
func NewGRPCServer(
	manager *proxy.Manager,
	failover *failover.Handler,
	adblock *adblock.Engine,
	cfg *config.Config,
) *GRPCServer {
	return &GRPCServer{
		manager:    manager,
		failover:   failover,
		adblock:    adblock,
		config:     cfg,
		updateChan: make(chan *pb.ProxyUpdate, 10),
	}
}

// Start begins listening on the configured port.
func (s *GRPCServer) Start() error {
	s.mu.Lock()
	if s.isRunning {
		s.mu.Unlock()
		return fmt.Errorf("server is already running")
	}
	s.isRunning = true
	s.mu.Unlock()

	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", s.config.GRPCPort))
	if err != nil {
		return fmt.Errorf("failed to listen: %w", err)
	}

	s.grpcSrv = grpc.NewServer(
		grpc.UnaryInterceptor(s.authInterceptor),
		grpc.StreamInterceptor(s.streamAuthInterceptor),
	)
	pb.RegisterProxyEngineServer(s.grpcSrv, s)
	reflection.Register(s.grpcSrv)

	// Subscribe to failover updates
	go s.listenForProxySwitches()

	return s.grpcSrv.Serve(lis)
}

// Stop gracefully shuts down the server.
func (s *GRPCServer) Stop() {
	s.mu.Lock()
	defer s.mu.Unlock()
	
	if s.isRunning && s.grpcSrv != nil {
		s.grpcSrv.GracefulStop()
		s.isRunning = false
	}
}

// listenForProxySwitches forwards failover switches to the gRPC update stream.
func (s *GRPCServer) listenForProxySwitches() {
	updates := s.failover.Subscribe()
	for p := range updates {
		if p == nil {
			continue
		}
		update := &pb.ProxyUpdate{
			Type:    pb.UpdateType_UPDATE_TYPE_PROXY_CHANGED,
			Message: "Switched to better proxy",
			Proxy: &pb.ProxyInfo{
				Id:       p.ID,
				Ip:       p.IP,
				Port:     int32(p.Port),
				Protocol: pb.ProxyProtocol(pb.ProxyProtocol_value["PROXY_PROTOCOL_" + stringsToUpper(string(p.Type))]),
				Country:  p.Country,
				City:     p.City,
			},
		}
		
		// Non-blocking send
		select {
		case s.updateChan <- update:
		default:
		}
	}
}

func (s *GRPCServer) authInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
	if !s.config.AuthEnabled {
		return handler(ctx, req)
	}

	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return nil, status.Errorf(codes.Unauthenticated, "metadata is not provided")
	}

	values := md["authorization"]
	if len(values) == 0 {
		return nil, status.Errorf(codes.Unauthenticated, "authorization token is not provided")
	}

	auth := values[0]
	if !strings.HasPrefix(auth, "Basic ") {
		return nil, status.Errorf(codes.Unauthenticated, "invalid authorization token format")
	}

	decoded, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(auth, "Basic "))
	if err != nil {
		return nil, status.Errorf(codes.Unauthenticated, "invalid authorization token")
	}

	parts := strings.SplitN(string(decoded), ":", 2)
	if len(parts) != 2 || parts[0] != s.config.AuthUsername || parts[1] != s.config.AuthPassword {
		return nil, status.Errorf(codes.Unauthenticated, "invalid username or password")
	}

	return handler(ctx, req)
}

func (s *GRPCServer) streamAuthInterceptor(srv interface{}, ss grpc.ServerStream, info *grpc.StreamServerInfo, handler grpc.StreamHandler) error {
	if !s.config.AuthEnabled {
		return handler(srv, ss)
	}

	md, ok := metadata.FromIncomingContext(ss.Context())
	if !ok {
		return status.Errorf(codes.Unauthenticated, "metadata is not provided")
	}

	values := md["authorization"]
	if len(values) == 0 {
		return status.Errorf(codes.Unauthenticated, "authorization token is not provided")
	}

	auth := values[0]
	if !strings.HasPrefix(auth, "Basic ") {
		return status.Errorf(codes.Unauthenticated, "invalid authorization token format")
	}

	decoded, err := base64.StdEncoding.DecodeString(strings.TrimPrefix(auth, "Basic "))
	if err != nil {
		return status.Errorf(codes.Unauthenticated, "invalid authorization token")
	}

	parts := strings.SplitN(string(decoded), ":", 2)
	if len(parts) != 2 || parts[0] != s.config.AuthUsername || parts[1] != s.config.AuthPassword {
		return status.Errorf(codes.Unauthenticated, "invalid username or password")
	}

	return handler(srv, ss)
}

func stringsToUpper(s string) string {
	return s // we will just let it be handled simply, actually let's use standard pb values below
}

// -- RPC Implementations --

func (s *GRPCServer) Connect(ctx context.Context, req *pb.ConnectRequest) (*pb.ConnectResponse, error) {
	// Initialize failover, ignore error if no proxies available yet
	s.failover.Initialize()
	
	// Clear failover history so it can pick the absolute best when manually requested
	s.failover.ClearHistory()

	var activeInfo *pb.ProxyInfo
	active := s.failover.CurrentProxy()
	if active != nil {
		activeInfo = convertProxy(active)
	}

	return &pb.ConnectResponse{
		Success: true,
		ActiveProxy: activeInfo,
	}, nil
}

func (s *GRPCServer) Disconnect(ctx context.Context, req *pb.DisconnectRequest) (*pb.DisconnectResponse, error) {
	if strings.HasPrefix(req.SessionId, "fail_") {
		proxyID := strings.TrimPrefix(req.SessionId, "fail_")
		// Client is signaling that this specific proxy is dead/refusing connections
		log.Printf("[gRPC] Client reported proxy %s as dead. Triggering failover...", proxyID)
		
		// Tell Manager to penalize and mark as dead
		s.manager.ReportFailure(proxyID)
		
		// Force failover
		s.failover.SuggestSwitch()
	} else if req.SessionId == "switch" {
		log.Printf("[gRPC] Client requested a forced proxy switch")
		s.failover.SuggestSwitch()
	}
	return &pb.DisconnectResponse{Success: true}, nil
}

func (s *GRPCServer) GetActiveProxy(ctx context.Context, req *pb.Empty) (*pb.ProxyInfo, error) {
	active := s.failover.CurrentProxy()
	if active == nil {
		return nil, status.Errorf(codes.NotFound, "no active proxy")
	}
	
	info := convertProxy(active)
	// Fetch live ping
	st := s.manager.GetProxyStatus(active.ID)
	if st != nil && st.ResponseTimeMs > 0 {
		info.SpeedMs = st.ResponseTimeMs
	} else {
		info.SpeedMs = active.Ping
	}
	
	return info, nil
}

func (s *GRPCServer) StreamProxyUpdates(req *pb.Empty, stream grpc.ServerStreamingServer[pb.ProxyUpdate]) error {
	// Simple streaming loop reading from the global update chan
	// In a real app with multiple clients, we'd use a pub/sub pattern
	for {
		select {
		case <-stream.Context().Done():
			return nil
		case update := <-s.updateChan:
			if err := stream.Send(update); err != nil {
				return err
			}
		}
	}
}

func (s *GRPCServer) GetEngineStatus(ctx context.Context, req *pb.Empty) (*pb.EngineStatus, error) {
	return &pb.EngineStatus{
		Running:        s.isRunning,
		Mode:           "self-hosted",
	}, nil
}

func (s *GRPCServer) GetPoolSummary(ctx context.Context, req *pb.Empty) (*pb.PoolSummary, error) {
	sum := s.manager.GetPoolSummary()
	return &pb.PoolSummary{
		Total:         int32(sum.Total),
		Alive:         int32(sum.Alive),
		Dead:          int32(sum.Dead),
		DeadRetryable: int32(sum.DeadRetryable),
		Blacklisted:   int32(sum.Blacklisted),
		Unchecked:     int32(sum.Unchecked),
	}, nil
}

func (s *GRPCServer) ToggleAdBlock(ctx context.Context, req *pb.ToggleRequest) (*pb.ToggleResponse, error) {
	s.adblock.ToggleEnabled(req.Enabled)
	return &pb.ToggleResponse{Success: true, Enabled: req.Enabled}, nil
}

func (s *GRPCServer) GetProxies(ctx context.Context, req *pb.GetProxiesRequest) (*pb.ProxiesResponse, error) {
	allProxies := s.manager.GetAllProxies()

	type scoredEntry struct {
		info  *pb.ProxyInfo
		score float64
	}

	var entries []scoredEntry

	for _, p := range allProxies {
		st := s.manager.GetProxyStatus(p.ID)
		if st == nil || !st.Alive || st.Blacklisted {
			continue
		}
		if req.CountryFilter != "" && p.Country != req.CountryFilter {
			continue
		}
		info := convertProxy(p)
		if st.ResponseTimeMs > 0 {
			info.SpeedMs = st.ResponseTimeMs
		} else {
			info.SpeedMs = p.Ping
		}

		sc := s.manager.CalculateScore(p)
		info.Score = sc

		entries = append(entries, scoredEntry{info: info, score: sc})
	}

	// Sort by score descending so the client gets best proxies first
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].score > entries[j].score
	})

	// Cap results
	limit := len(entries)
	if req.Limit > 0 && int(req.Limit) < limit {
		limit = int(req.Limit)
	}
	if limit > 200 {
		limit = 200
	}

	result := make([]*pb.ProxyInfo, limit)
	for i := 0; i < limit; i++ {
		result[i] = entries[i].info
	}

	return &pb.ProxiesResponse{Proxies: result}, nil
}

func (s *GRPCServer) CheckDomain(ctx context.Context, req *pb.DomainCheckRequest) (*pb.DomainCheckResponse, error) {
	blocked, cat := s.adblock.ShouldBlock(req.Domain)
	return &pb.DomainCheckResponse{
		Blocked:  blocked,
		Category: cat,
	}, nil
}

func (s *GRPCServer) UpdateConfig(ctx context.Context, req *pb.ConfigUpdateRequest) (*pb.ConfigResponse, error) {
	if req.Updates == nil {
		return &pb.ConfigResponse{}, nil
	}

	needsFailover := false

	// Update filters
	if val, ok := req.Updates["CountryFilter"]; ok {
		s.config.CountryFilter = val
		needsFailover = true
	}
	
	if val, ok := req.Updates["MaxSpeedMs"]; ok {
		var speed int
		fmt.Sscanf(val, "%d", &speed)
		if speed >= 0 {
			s.config.MaxSpeedMs = speed
			needsFailover = true
		}
	}
	
	// Force a failover check if filters changed
	if needsFailover {
		s.failover.ClearHistory() // Clear history so we pick the absolute best for the new filters!
		s.failover.RefreshBest()
	}

	// Just return success for now
	return &pb.ConfigResponse{
		Config: map[string]string{
			"CountryFilter": s.config.CountryFilter,
			"MaxSpeedMs": fmt.Sprintf("%d", s.config.MaxSpeedMs),
		},
	}, nil
}

// -- Rotation RPCs --

func (s *GRPCServer) GetRotationStatus(ctx context.Context, req *pb.Empty) (*pb.RotationStatus, error) {
	rotator := s.manager.Rotator()
	if rotator == nil {
		return nil, status.Errorf(codes.Internal, "rotator not initialized")
	}

	st := rotator.GetStatus()
	
	activeIP, activeType := "", ""
	var activePort int32
	if st.ActiveProxy != nil {
		activeIP = st.ActiveProxy.IP
		activePort = int32(st.ActiveProxy.Port)
		activeType = string(st.ActiveProxy.Type)
	}

	return &pb.RotationStatus{
		Enabled:       st.Enabled,
		PoolSize:      int32(st.PoolSize),
		CurrentIndex:  int32(st.CurrentIndex),
		ActiveProxyIp: activeIP,
		ActiveProxyPort: activePort,
		ActiveProxyType: activeType,
		IntervalSec:   int32(s.config.RotationIntervalSec),
		ProxyTypes:    s.config.RotationProxyTypes,
		CountryFilter: s.config.RotationCountryFilter,
		MaxSpeedMs:    int32(s.config.RotationMaxSpeedMs),
		SslOnly:       s.config.RotationSSLOnly,
		FilteredCount: int32(st.FilteredCount),
	}, nil
}

func (s *GRPCServer) GetRotationPool(ctx context.Context, req *pb.Empty) (*pb.RotationPoolResponse, error) {
	rotator := s.manager.Rotator()
	if rotator == nil {
		return nil, status.Errorf(codes.Internal, "rotator not initialized")
	}

	pool := rotator.GetPool()
	var res []*pb.RotationPoolItem
	for _, p := range pool {
		ping := p.Ping
		ssl := false
		st := s.manager.GetProxyStatus(p.ID)
		if st != nil {
			if st.ResponseTimeMs > 0 {
				ping = st.ResponseTimeMs
			}
			ssl = st.SSLVerified
		}

		res = append(res, &pb.RotationPoolItem{
			Ip:      p.IP,
			Port:    int32(p.Port),
			Type:    string(p.Type),
			Country: p.Country,
			Ping:    ping,
			Ssl:     ssl,
			Score:   s.manager.CalculateScore(p),
		})
	}
	return &pb.RotationPoolResponse{Proxies: res}, nil
}

func (s *GRPCServer) EnableRotation(ctx context.Context, req *pb.RotationConfig) (*pb.Empty, error) {
	s.mu.Lock()
	s.config.RotationEnabled = true
	s.config.RotationIntervalSec = int(req.IntervalSec)
	s.config.RotationProxyTypes = req.ProxyTypes
	s.config.RotationCountryFilter = req.CountryFilter
	s.config.RotationMaxSpeedMs = int(req.MaxSpeedMs)
	s.config.RotationPoolSize = int(req.PoolSize)
	s.config.RotationSSLOnly = req.SslOnly
	s.mu.Unlock()

	rotator := s.manager.Rotator()
	if rotator != nil {
		rotator.Start()
	}

	return &pb.Empty{}, nil
}

func (s *GRPCServer) DisableRotation(ctx context.Context, req *pb.Empty) (*pb.Empty, error) {
	s.mu.Lock()
	s.config.RotationEnabled = false
	s.mu.Unlock()

	rotator := s.manager.Rotator()
	if rotator != nil {
		rotator.Stop()
	}

	// Restore normal failover
	s.failover.ClearHistory()
	s.failover.RefreshBest()

	return &pb.Empty{}, nil
}

// Helpers

func convertProxy(p *models.Proxy) *pb.ProxyInfo {
	if p == nil {
		return nil
	}
	
	ptypeStr := string(p.Type)
	var pbType pb.ProxyProtocol
	switch ptypeStr {
	case "socks5": pbType = pb.ProxyProtocol_PROXY_PROTOCOL_SOCKS5
	case "socks4": pbType = pb.ProxyProtocol_PROXY_PROTOCOL_SOCKS4
	case "http":   pbType = pb.ProxyProtocol_PROXY_PROTOCOL_HTTP
	case "https":  pbType = pb.ProxyProtocol_PROXY_PROTOCOL_HTTPS
	default: pbType = pb.ProxyProtocol_PROXY_PROTOCOL_UNSPECIFIED
	}

	return &pb.ProxyInfo{
		Id:       p.ID,
		Ip:       p.IP,
		Port:     int32(p.Port),
		Protocol: pbType,
		Username: p.Username,
		Password: p.Password,
		Country:  p.Country,
		City:     p.City,
	}
}

func getSafeProxyID(p *models.Proxy) string {
	if p == nil {
		return ""
	}
	return p.ID
}

package core

import (
	"context"
	"testing"
	"time"

	"github.com/crrrowz/proxy-redirector-v3/client/internal/config"
	"github.com/crrrowz/proxy-redirector-v3/client/internal/engine"
	"github.com/crrrowz/proxy-redirector-v3/client/internal/proxy"
	"github.com/crrrowz/proxy-redirector-v3/client/tests/mock"
	pb "github.com/crrrowz/proxy-redirector-v3/client/internal/engine/pb"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func setupTestCore(t *testing.T) (*Core, func()) {
	server, listener := mock.StartMockServer()

	// Connect gRPC client to mock server
	conn, err := grpc.DialContext(context.Background(), "bufnet", grpc.WithContextDialer(mock.GetBufDialer(listener)), grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		t.Fatalf("Failed to dial bufnet: %v", err)
	}

	grpcClient := &engine.GRPCClient{
		Conn:   conn,
		Client: pb.NewProxyEngineClient(conn),
	}
	
	cfg := &config.Config{}
	socks5 := &proxy.SOCKS5Server{}
	httpProxy := &proxy.HTTPProxyServer{}
	tracker := &proxy.ClientTracker{}

	core := NewCore(cfg, grpcClient, socks5, httpProxy, tracker)

	cleanup := func() {
		conn.Close()
		server.Stop()
	}

	return core, cleanup
}

func TestCore_GetEngineStatus(t *testing.T) {
	core, cleanup := setupTestCore(t)
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	core.SetContext(ctx)

	status, err := core.GetEngineStatus()
	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if status == nil {
		t.Fatalf("Expected status, got nil")
	}
	if status.ActiveProxy == nil || status.ActiveProxy.Ip != "192.168.1.1" {
		t.Errorf("Expected ActiveProxy.Ip to be 192.168.1.1, got %v", status.ActiveProxy)
	}
}

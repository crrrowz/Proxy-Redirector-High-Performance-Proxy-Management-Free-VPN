package tests

import (
	"context"
	"net"
	"testing"

	"github.com/crrrowz/proxy-redirector-v3/client/internal/config"
	"github.com/crrrowz/proxy-redirector-v3/client/internal/core"
	"github.com/crrrowz/proxy-redirector-v3/client/internal/engine"
	"github.com/crrrowz/proxy-redirector-v3/client/internal/proxy"
	"github.com/crrrowz/proxy-redirector-v3/client/tests/mock"
	pb "github.com/crrrowz/proxy-redirector-v3/shared/pb"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func setupIntegration(t *testing.T) (*core.Core, func()) {
	server, listener := mock.StartMockServer()

	// Use context with dialer to connect to bufconn
	dialer := func(context.Context, string) (net.Conn, error) {
		return listener.Dial()
	}

	conn, err := grpc.DialContext(context.Background(), "bufnet", grpc.WithContextDialer(dialer), grpc.WithTransportCredentials(insecure.NewCredentials()))
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

	c := core.NewCore(cfg, grpcClient, socks5, httpProxy, tracker)

	cleanup := func() {
		conn.Close()
		server.Stop()
	}
	return c, cleanup
}

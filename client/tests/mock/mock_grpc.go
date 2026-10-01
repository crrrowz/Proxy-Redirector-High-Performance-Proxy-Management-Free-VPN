package mock

import (
	"context"
	"net"

	pb "github.com/crrrowz/proxy-redirector-v3/client/internal/engine/pb"
	"google.golang.org/grpc"
	"google.golang.org/grpc/test/bufconn"
)

const bufSize = 1024 * 1024

type MockEngineServer struct {
	pb.UnimplementedProxyEngineServer
}

func (s *MockEngineServer) GetEngineStatus(ctx context.Context, req *pb.Empty) (*pb.EngineStatus, error) {
	return &pb.EngineStatus{
		Running:      true,
		Mode:         "mock",
		Socks5Port:   1080,
		HttpPort:     8080,
		ActiveProxy:  &pb.ProxyInfo{Ip: "192.168.1.1"},
	}, nil
}

func (s *MockEngineServer) GetProxies(ctx context.Context, req *pb.GetProxiesRequest) (*pb.ProxiesResponse, error) {
	proxies := []*pb.ProxyInfo{
		{Ip: "192.168.1.1", Port: 8080, Protocol: pb.ProxyProtocol_PROXY_PROTOCOL_SOCKS5, Score: 95, SpeedMs: 20},
		{Ip: "192.168.1.2", Port: 8080, Protocol: pb.ProxyProtocol_PROXY_PROTOCOL_SOCKS5, Score: 85, SpeedMs: 40},
		{Ip: "192.168.1.3", Port: 8080, Protocol: pb.ProxyProtocol_PROXY_PROTOCOL_SOCKS5, Score: 75, SpeedMs: 60},
	}
	return &pb.ProxiesResponse{Proxies: proxies}, nil
}

func (s *MockEngineServer) GetActiveProxy(ctx context.Context, req *pb.Empty) (*pb.ProxyInfo, error) {
	return &pb.ProxyInfo{
		Ip: "192.168.1.1", Port: 8080, Protocol: pb.ProxyProtocol_PROXY_PROTOCOL_SOCKS5, Score: 95, SpeedMs: 20,
	}, nil
}

func (s *MockEngineServer) UpdateConfig(ctx context.Context, req *pb.ConfigUpdateRequest) (*pb.ConfigResponse, error) {
	return &pb.ConfigResponse{Config: req.Updates}, nil
}

func (s *MockEngineServer) GetRotationStatus(ctx context.Context, req *pb.Empty) (*pb.RotationStatus, error) {
	return &pb.RotationStatus{
		Enabled: true,
		IntervalSec: 60,
	}, nil
}

func StartMockServer() (*grpc.Server, *bufconn.Listener) {
	listener := bufconn.Listen(bufSize)
	server := grpc.NewServer()
	pb.RegisterProxyEngineServer(server, &MockEngineServer{})
	go func() {
		if err := server.Serve(listener); err != nil {
			panic(err)
		}
	}()
	return server, listener
}

func GetBufDialer(listener *bufconn.Listener) func(context.Context, string) (net.Conn, error) {
	return func(ctx context.Context, str string) (net.Conn, error) {
		return listener.Dial()
	}
}

package core

import (
	"context"

	"github.com/crrrowz/proxy-redirector-v3/client/internal/config"
	"github.com/crrrowz/proxy-redirector-v3/client/internal/engine"
	"github.com/crrrowz/proxy-redirector-v3/client/internal/proxy"
)

type Core struct {
	Ctx        context.Context
	Config     *config.Config
	GRPCClient *engine.GRPCClient
	Socks5     *proxy.SOCKS5Server
	HTTPProxy  *proxy.HTTPProxyServer
	Tracker    *proxy.ClientTracker
}

func NewCore(cfg *config.Config, grpcClient *engine.GRPCClient, socks5 *proxy.SOCKS5Server, httpProxy *proxy.HTTPProxyServer, tracker *proxy.ClientTracker) *Core {
	return &Core{
		Config:     cfg,
		GRPCClient: grpcClient,
		Socks5:     socks5,
		HTTPProxy:  httpProxy,
		Tracker:    tracker,
	}
}

func (c *Core) SetContext(ctx context.Context) {
	c.Ctx = ctx
}

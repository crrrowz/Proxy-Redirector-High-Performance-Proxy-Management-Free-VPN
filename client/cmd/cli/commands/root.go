package commands

import (
	"context"
	"fmt"

	"github.com/crrrowz/proxy-redirector-v3/client/internal/config"
	"github.com/crrrowz/proxy-redirector-v3/client/internal/core"
	"github.com/crrrowz/proxy-redirector-v3/client/internal/engine"
	"github.com/crrrowz/proxy-redirector-v3/client/internal/proxy"
)

// Execute routes CLI subcommands
func Execute(ctx context.Context, args []string) error {
	if len(args) == 0 {
		printHelp()
		return nil
	}

	cmd := args[0]
	subArgs := args[1:]

	switch cmd {
	case "help", "-h", "--help":
		printHelp()
		return nil

	case "version", "-v", "--version":
		fmt.Println("Proxy Redirector CLI v3.0.0 (Unified)")
		return nil

	case "start":
		return runStart(ctx, subArgs)

	case "status":
		return runStatus(ctx, subArgs)

	case "rotate":
		return runRotate(ctx, subArgs)

	case "pool":
		return runPool(ctx, subArgs)

	case "adblock":
		return runAdBlock(ctx, subArgs)

	case "config":
		return runConfig(ctx, subArgs)

	default:
		return fmt.Errorf("unknown command: %s (run 'proxy-cli help' for usage)", cmd)
	}
}

func printHelp() {
	fmt.Println(`Proxy Redirector CLI — High-Performance Proxy Management & Relay

Usage:
  proxy-cli <command> [arguments]

Available Commands:
  start      Start local proxy relays (SOCKS5/HTTP) and connect to engine
  status     Display live engine status, active proxy, and connected devices
  rotate     Trigger or toggle Surge Mode dynamic proxy rotation
  pool       List, inspect, and filter proxies in the engine pool
  adblock    Manage adblock rules, categories, and inspection
  config     View or update engine configuration parameters
  version    Show proxy-cli version information
  help       Show this help message

Use "proxy-cli <command> -h" for more information about a command.`)
}

// helper to initialize Core and gRPC client
func initCore(ctx context.Context, engineAddr, authUser, authPass string, socksPort, httpPort int) (*core.Core, error) {
	if engineAddr == "" {
		engineAddr = "127.0.0.1:50051"
	}
	if socksPort <= 0 {
		socksPort = 1080
	}
	if httpPort <= 0 {
		httpPort = 8080
	}

	cfg := &config.Config{
		EngineAddress: engineAddr,
		SOCKS5Port:    socksPort,
		HTTPPort:      httpPort,
		AuthUsername:  authUser,
		AuthPassword:  authPass,
	}

	grpcClient := engine.NewGRPCClient(engineAddr, authUser, authPass)
	if err := grpcClient.Connect(ctx); err != nil {
		return nil, fmt.Errorf("failed to connect to engine at %s: %w", engineAddr, err)
	}

	tracker := proxy.NewClientTracker()
	socks5Server := proxy.NewSOCKS5Server(socksPort, grpcClient, tracker)
	httpProxyServer := proxy.NewHTTPProxyServer(httpPort, grpcClient, tracker)

	c := core.NewCore(cfg, grpcClient, socks5Server, httpProxyServer, tracker)
	c.SetContext(ctx)
	return c, nil
}

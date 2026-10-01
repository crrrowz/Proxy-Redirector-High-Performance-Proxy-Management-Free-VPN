package commands

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"strings"

	"github.com/crrrowz/proxy-redirector-v3/client/internal/config"
	"github.com/crrrowz/proxy-redirector-v3/client/internal/core"
	"github.com/crrrowz/proxy-redirector-v3/client/internal/engine"
	"github.com/crrrowz/proxy-redirector-v3/client/internal/proxy"
)

// Execute routes CLI subcommands
func Execute(ctx context.Context, args []string) error {
	if len(args) == 0 {
		return runInteractiveMenu(ctx)
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

func runInteractiveMenu(ctx context.Context) error {
	for {
		fmt.Println("\n========================================================")
		fmt.Println(" 🔀 PROXY REDIRECTOR CLI — Interactive Control Console")
		fmt.Println("========================================================")
		fmt.Println(" 1. 📊 Status   — View live engine status & active proxy")
		fmt.Println(" 2. 🚀 Start    — Start local proxy relays (SOCKS5/HTTP)")
		fmt.Println(" 3. ⚡ Rotate   — Force switch active proxy (Failover)")
		fmt.Println(" 4. 🏊 Pool     — List available proxies in the pool")
		fmt.Println(" 5. 🛡️  AdBlock  — View AdBlocker stats & check domains")
		fmt.Println(" 6. ⚙️  Config   — View engine configuration settings")
		fmt.Println(" 7. ❓ Help     — Show command line arguments help")
		fmt.Println(" 0. 🛑 Exit")
		fmt.Println("========================================================")
		fmt.Print(" Select an option [0-7]: ")

		reader := bufio.NewReader(os.Stdin)
		input, err := reader.ReadString('\n')
		if err != nil {
			return nil
		}
		choice := strings.TrimSpace(input)

		switch choice {
		case "1":
			_ = runStatus(ctx, nil)
		case "2":
			return runStart(ctx, nil)
		case "3":
			_ = runRotate(ctx, []string{"--force"})
		case "4":
			_ = runPool(ctx, []string{"--limit", "15"})
		case "5":
			_ = runAdBlock(ctx, nil)
		case "6":
			_ = runConfig(ctx, nil)
		case "7":
			printHelp()
		case "0", "exit", "quit", "q":
			fmt.Println("Exiting CLI. Goodbye!")
			return nil
		default:
			fmt.Println("Invalid choice, please select 0 to 7.")
		}

		fmt.Print("\nPress Enter to return to menu...")
		_, _ = reader.ReadString('\n')
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

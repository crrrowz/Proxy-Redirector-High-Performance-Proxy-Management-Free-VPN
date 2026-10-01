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
	// Authenticate and verify connection immediately before showing menu
	client, err := ConnectGRPC(ctx, "", "")
	if err != nil {
		fmt.Printf("❌ Failed to connect to Engine: %v\n", err)
		return err
	}
	if client != nil {
		client.Disconnect()
	}

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
			if err := runStatus(ctx, nil); err != nil {
				fmt.Printf("\n❌ %v\n", err)
			}
		case "2":
			if err := runStart(ctx, nil); err != nil {
				fmt.Printf("\n❌ %v\n", err)
			}
			return nil
		case "3":
			if err := runRotate(ctx, []string{"--force"}); err != nil {
				fmt.Printf("\n❌ %v\n", err)
			}
		case "4":
			if err := runPool(ctx, []string{"--limit", "15"}); err != nil {
				fmt.Printf("\n❌ %v\n", err)
			}
		case "5":
			if err := runAdBlock(ctx, nil); err != nil {
				fmt.Printf("\n❌ %v\n", err)
			}
		case "6":
			if err := runConfig(ctx, nil); err != nil {
				fmt.Printf("\n❌ %v\n", err)
			}
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

// helper to prompt for API Key interactively when missing or wrong
func promptForAPIKey(reader *bufio.Reader) string {
	fmt.Print("\n🔑 Enter Engine API Key (pk_live_...): ")
	key, _ := reader.ReadString('\n')
	key = strings.TrimSpace(key)
	if key != "" {
		cfg := config.LoadConfig()
		cfg.APIKey = key
		_ = cfg.Save()
		fmt.Println("✅ API Key saved to local settings.")
	}
	return key
}

// ConnectGRPC connects to the engine and prompts interactively if the API key is missing or invalid.
func ConnectGRPC(ctx context.Context, engineAddr, apiKey string) (*engine.GRPCClient, error) {
	savedCfg := config.LoadConfig()

	if engineAddr == "" {
		if envAddr := os.Getenv("PROXY_ENGINE_ADDR"); envAddr != "" {
			engineAddr = envAddr
		} else if savedCfg.EngineAddress != "" {
			engineAddr = savedCfg.EngineAddress
		} else {
			engineAddr = "127.0.0.1:50051"
		}
	}
	if apiKey == "" {
		if envKey := os.Getenv("PROXY_ENGINE_KEY"); envKey != "" {
			apiKey = envKey
		} else if savedCfg.APIKey != "" {
			apiKey = savedCfg.APIKey
		}
	}

	reader := bufio.NewReader(os.Stdin)
	for apiKey == "" {
		apiKey = promptForAPIKey(reader)
	}

	client := engine.NewGRPCClientWithKey(engineAddr, apiKey)
	if err := client.Connect(ctx); err != nil {
		if strings.Contains(err.Error(), "authentication failed") || strings.Contains(err.Error(), "Unauthenticated") {
			fmt.Println("\n❌ Invalid or expired API Key.")
			newKey := promptForAPIKey(reader)
			if newKey != "" {
				client.SetAPIKey(newKey)
				if retryErr := client.Connect(ctx); retryErr != nil {
					return nil, retryErr
				}
				return client, nil
			}
		}
		return nil, err
	}
	return client, nil
}

// helper to initialize Core and gRPC client
func initCore(ctx context.Context, engineAddr, apiKey string, socksPort, httpPort int) (*core.Core, error) {
	savedCfg := config.LoadConfig()

	if engineAddr == "" {
		if envAddr := os.Getenv("PROXY_ENGINE_ADDR"); envAddr != "" {
			engineAddr = envAddr
		} else if savedCfg.EngineAddress != "" {
			engineAddr = savedCfg.EngineAddress
		} else {
			engineAddr = "127.0.0.1:50051"
		}
	}

	grpcClient, err := ConnectGRPC(ctx, engineAddr, apiKey)
	if err != nil {
		return nil, err
	}

	if socksPort <= 0 {
		if savedCfg.SOCKS5Port > 0 {
			socksPort = savedCfg.SOCKS5Port
		} else {
			socksPort = 1080
		}
	}
	if httpPort <= 0 {
		if savedCfg.HTTPPort > 0 {
			httpPort = savedCfg.HTTPPort
		} else {
			httpPort = 8080
		}
	}

	cfg := &config.Config{
		EngineAddress: engineAddr,
		APIKey:        savedCfg.APIKey,
		SOCKS5Port:    socksPort,
		HTTPPort:      httpPort,
	}

	tracker := proxy.NewClientTracker()
	socks5Server := proxy.NewSOCKS5Server(socksPort, grpcClient, tracker)
	httpProxyServer := proxy.NewHTTPProxyServer(httpPort, grpcClient, tracker)

	c := core.NewCore(cfg, grpcClient, socks5Server, httpProxyServer, tracker)
	c.SetContext(ctx)
	return c, nil
}

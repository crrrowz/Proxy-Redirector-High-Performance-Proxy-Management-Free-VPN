package commands

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"os"

	"github.com/crrrowz/proxy-redirector-v3/client/internal/engine"
)

func runStatus(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("status", flag.ExitOnError)
	engineAddr := fs.String("engine", "127.0.0.1:50051", "Engine gRPC server address")
	authUser := fs.String("user", "", "Engine gRPC auth username")
	authPass := fs.String("password", "", "Engine gRPC auth password")
	asJSON := fs.Bool("json", false, "Output status as JSON")

	if err := fs.Parse(args); err != nil {
		return err
	}

	grpcClient := engine.NewGRPCClient(*engineAddr, *authUser, *authPass)
	if err := grpcClient.Connect(ctx); err != nil {
		return fmt.Errorf("failed to connect to engine: %w", err)
	}
	defer grpcClient.Disconnect()

	status, err := grpcClient.GetEngineStatus(ctx)
	if err != nil {
		return fmt.Errorf("failed to query engine status: %w", err)
	}

	activeProxy, _ := grpcClient.GetActiveProxy(ctx)
	poolSummary, _ := grpcClient.GetPoolSummary(ctx)
	rotStatus, _ := grpcClient.GetRotationStatus(ctx)
	blockStats, _ := grpcClient.GetBlockStats(ctx)

	if *asJSON {
		data := map[string]interface{}{
			"engine":       status,
			"active_proxy": activeProxy,
			"pool":         poolSummary,
			"rotation":     rotStatus,
			"adblock":      blockStats,
		}
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(data)
	}

	fmt.Println("==================================================")
	fmt.Println("             PROXY REDIRECTOR ENGINE STATUS       ")
	fmt.Println("==================================================")
	fmt.Printf("Engine Mode:        %s\n", status.Mode)
	fmt.Printf("SOCKS5 Status:      Port %d (Running: %v)\n", status.Socks5Port, status.Socks5Ok)
	fmt.Printf("HTTP Status:        Port %d (Running: %v)\n", status.HttpPort, status.HttpOk)

	fmt.Println("\n--- [Active Proxy] ---")
	if activeProxy != nil && activeProxy.IP != "" {
		fmt.Printf("Endpoint:    %s:%d (%s)\n", activeProxy.IP, activeProxy.Port, activeProxy.Type)
		fmt.Printf("Location:    %s, %s\n", activeProxy.Country, activeProxy.City)
		fmt.Printf("Latency:     %.1f ms\n", activeProxy.Ping)
	} else {
		fmt.Println("No active proxy currently selected.")
	}

	fmt.Println("\n--- [Pool Summary] ---")
	if poolSummary != nil {
		fmt.Printf("Total: %d | Alive: %d | Dead: %d | Retryable: %d | Blacklisted: %d | Unchecked: %d\n",
			poolSummary.Total, poolSummary.Alive, poolSummary.Dead, poolSummary.DeadRetryable, poolSummary.Blacklisted, poolSummary.Unchecked)
	}

	fmt.Println("\n--- [Surge Rotation] ---")
	if rotStatus != nil {
		fmt.Printf("Enabled:   %v\n", rotStatus.Enabled)
		if rotStatus.Enabled {
			fmt.Printf("Interval:  %ds | Pool Size: %d | Active: %s\n", rotStatus.IntervalSec, rotStatus.PoolSize, rotStatus.ActiveProxyIp)
		}
	}

	fmt.Println("\n--- [Ad & Tracker Blocker] ---")
	if blockStats != nil {
		fmt.Printf("Enabled:       %v\n", blockStats.Enabled)
		fmt.Printf("Total Blocked: %d queries\n", blockStats.TotalBlocked)
		fmt.Printf("Rules Count:   %d domains\n", blockStats.RulesCount)
	}
	fmt.Println("==================================================")

	return nil
}

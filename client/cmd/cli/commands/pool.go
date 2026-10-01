package commands

import (
	"context"
	"flag"
	"fmt"
	"strings"

	"github.com/crrrowz/proxy-redirector-v3/client/internal/engine"
)

func runPool(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("pool", flag.ExitOnError)
	engineAddr := fs.String("engine", "127.0.0.1:50051", "Engine gRPC server address")
	authUser := fs.String("user", "", "Engine gRPC auth username")
	authPass := fs.String("password", "", "Engine gRPC auth password")
	country := fs.String("country", "", "Filter by country code")
	limit := fs.Int("limit", 20, "Maximum proxies to list")

	if err := fs.Parse(args); err != nil {
		return err
	}

	grpcClient := engine.NewGRPCClient(*engineAddr, *authUser, *authPass)
	if err := grpcClient.Connect(ctx); err != nil {
		return fmt.Errorf("failed to connect to engine: %w", err)
	}
	defer grpcClient.Disconnect()

	proxies, err := grpcClient.GetProxies(ctx, int32(*limit), *country)
	if err != nil {
		return fmt.Errorf("failed to query proxies: %w", err)
	}

	fmt.Printf("Displaying %d proxies:\n\n", len(proxies))
	fmt.Printf("%-24s %-10s %-10s %-12s\n", "ENDPOINT", "TYPE", "COUNTRY", "LATENCY")
	fmt.Println(strings.Repeat("-", 60))

	for _, p := range proxies {
		endpoint := fmt.Sprintf("%s:%d", p.IP, p.Port)
		countryStr := p.Country
		if countryStr == "" {
			countryStr = "??"
		}
		fmt.Printf("%-24s %-10s %-10s %-12.0fms\n",
			endpoint, p.Type, countryStr, p.Ping)
	}

	return nil
}

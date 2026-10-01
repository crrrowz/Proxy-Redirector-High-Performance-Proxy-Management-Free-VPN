package commands

import (
	"context"
	"flag"
	"fmt"
	"strings"
)

func runPool(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("pool", flag.ExitOnError)
	engineAddr := fs.String("engine", "", "Engine gRPC server address")
	apiKey := fs.String("key", "", "Engine API Key (pk_live_...)")
	country := fs.String("country", "", "Filter by country code")
	limit := fs.Int("limit", 20, "Maximum proxies to list")

	if err := fs.Parse(args); err != nil {
		return err
	}

	grpcClient, err := ConnectGRPC(ctx, *engineAddr, *apiKey)
	if err != nil {
		return err
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

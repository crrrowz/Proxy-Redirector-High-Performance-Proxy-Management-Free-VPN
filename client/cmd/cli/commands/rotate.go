package commands

import (
	"context"
	"flag"
	"fmt"

	"github.com/crrrowz/proxy-redirector-v3/client/internal/engine"
)

func runRotate(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("rotate", flag.ExitOnError)
	engineAddr := fs.String("engine", "127.0.0.1:50051", "Engine gRPC server address")
	authUser := fs.String("user", "", "Engine gRPC auth username")
	authPass := fs.String("password", "", "Engine gRPC auth password")
	enable := fs.Bool("enable", false, "Enable Surge dynamic rotation")
	disable := fs.Bool("disable", false, "Disable Surge dynamic rotation")
	interval := fs.Int("interval", 30, "Interval in seconds")
	poolSize := fs.Int("pool-size", 10, "Pool size")
	country := fs.String("country", "", "Country filter")
	maxSpeed := fs.Int("max-speed", 5000, "Max speed in ms")
	sslOnly := fs.Bool("ssl-only", false, "Require SSL verified proxies")
	force := fs.Bool("force", false, "Trigger immediate proxy switch")

	if err := fs.Parse(args); err != nil {
		return err
	}

	grpcClient := engine.NewGRPCClient(*engineAddr, *authUser, *authPass)
	if err := grpcClient.Connect(ctx); err != nil {
		return fmt.Errorf("failed to connect to engine: %w", err)
	}
	defer grpcClient.Disconnect()

	if *disable {
		if err := grpcClient.DisableRotation(ctx); err != nil {
			return fmt.Errorf("failed to disable rotation: %w", err)
		}
		fmt.Println("✅ Surge rotation disabled.")
		return nil
	}

	if *enable {
		if err := grpcClient.EnableRotation(ctx, *interval, []string{"socks5", "http"}, *country, *maxSpeed, *poolSize, *sslOnly); err != nil {
			return fmt.Errorf("failed to enable rotation: %w", err)
		}
		fmt.Printf("✅ Surge rotation enabled (Interval: %ds, Pool Size: %d)\n", *interval, *poolSize)
		return nil
	}

	if *force {
		active, err := grpcClient.GetActiveProxy(ctx)
		if err == nil && active != nil && active.ID != "" {
			grpcClient.ReportFailure(ctx, active.ID)
			fmt.Println("⚡ Triggered immediate proxy failover/rotation.")
			newActive, _ := grpcClient.GetActiveProxy(ctx)
			if newActive != nil {
				fmt.Printf("   New Active Proxy: %s:%d (%s)\n", newActive.IP, newActive.Port, newActive.Country)
			}
			return nil
		}
	}

	// Default: show status
	status, err := grpcClient.GetRotationStatus(ctx)
	if err != nil {
		return err
	}
	fmt.Printf("Surge Rotation: enabled=%v, interval=%ds, pool_size=%d\n",
		status.Enabled, status.IntervalSec, status.PoolSize)

	return nil
}

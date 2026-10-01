package commands

import (
	"context"
	"flag"
	"fmt"
	"strings"

	"github.com/crrrowz/proxy-redirector-v3/client/internal/engine"
)

func runConfig(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("config", flag.ExitOnError)
	engineAddr := fs.String("engine", "127.0.0.1:50051", "Engine gRPC server address")
	authUser := fs.String("user", "", "Engine gRPC auth username")
	authPass := fs.String("password", "", "Engine gRPC auth password")
	setParam := fs.String("set", "", "Update config parameter in KEY=VALUE format (e.g. MaxSpeedMs=3000)")

	if err := fs.Parse(args); err != nil {
		return err
	}

	grpcClient := engine.NewGRPCClient(*engineAddr, *authUser, *authPass)
	if err := grpcClient.Connect(ctx); err != nil {
		return fmt.Errorf("failed to connect to engine: %w", err)
	}
	defer grpcClient.Disconnect()

	if *setParam != "" {
		parts := strings.SplitN(*setParam, "=", 2)
		if len(parts) != 2 {
			return fmt.Errorf("invalid format for --set, expected KEY=VALUE (e.g. MaxSpeedMs=3000)")
		}
		key := strings.TrimSpace(parts[0])
		val := strings.TrimSpace(parts[1])

		updates := map[string]string{key: val}
		if err := grpcClient.UpdateConfig(ctx, updates); err != nil {
			return fmt.Errorf("failed to update config: %w", err)
		}
		fmt.Printf("✅ Configuration parameter '%s' updated to '%s'.\n", key, val)
		return nil
	}

	cfg, err := grpcClient.GetConfig(ctx)
	if err != nil {
		return fmt.Errorf("failed to get config: %w", err)
	}

	fmt.Println("=== Engine Configuration ===")
	for k, v := range cfg {
		fmt.Printf("%-24s: %s\n", k, v)
	}

	return nil
}

package commands

import (
	"context"
	"flag"
	"fmt"
	"strings"

	"github.com/crrrowz/proxy-redirector-v3/client/internal/config"
	"github.com/crrrowz/proxy-redirector-v3/client/internal/engine"
)

func runConfig(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("config", flag.ExitOnError)
	engineAddr := fs.String("engine", "", "Engine gRPC server address")
	apiKey := fs.String("key", "", "Engine API Key (pk_live_...)")
	setParam := fs.String("set", "", "Update config parameter in KEY=VALUE format (e.g. MaxSpeedMs=3000)")
	saveClient := fs.Bool("save-client", false, "Save provided --engine and --key into local client settings")

	if err := fs.Parse(args); err != nil {
		return err
	}

	savedCfg := config.LoadConfig()
	if *saveClient {
		if *engineAddr != "" {
			savedCfg.EngineAddress = *engineAddr
		}
		if *apiKey != "" {
			savedCfg.APIKey = *apiKey
		}
		if err := savedCfg.Save(); err != nil {
			return fmt.Errorf("failed to save client configuration: %w", err)
		}
		fmt.Printf("✅ Saved local client settings (Engine: %s, Key configured: %v)\n", savedCfg.EngineAddress, savedCfg.APIKey != "")
		return nil
	}

	addr := *engineAddr
	key := *apiKey
	if addr == "" {
		addr = savedCfg.EngineAddress
	}
	if key == "" {
		key = savedCfg.APIKey
	}
	if addr == "" {
		addr = "127.0.0.1:50051"
	}

	grpcClient := engine.NewGRPCClientWithKey(addr, key)
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

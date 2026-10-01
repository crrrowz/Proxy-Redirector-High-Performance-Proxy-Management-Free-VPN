package commands

import (
	"context"
	"flag"
	"fmt"
)

func runAdBlock(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("adblock", flag.ExitOnError)
	engineAddr := fs.String("engine", "", "Engine gRPC server address")
	apiKey := fs.String("key", "", "Engine API Key (pk_live_...)")
	enable := fs.Bool("enable", false, "Enable ad and tracker blocking")
	disable := fs.Bool("disable", false, "Disable ad and tracker blocking")
	check := fs.String("check", "", "Check if a domain is blocked (e.g. googleads.g.doubleclick.net)")

	if err := fs.Parse(args); err != nil {
		return err
	}

	grpcClient, err := ConnectGRPC(ctx, *engineAddr, *apiKey)
	if err != nil {
		return err
	}
	defer grpcClient.Disconnect()

	if *enable {
		if err := grpcClient.ToggleAdBlock(ctx, true); err != nil {
			return fmt.Errorf("failed to enable adblock: %w", err)
		}
		fmt.Println("🛡️ Ad & Tracker Blocker enabled.")
		return nil
	}

	if *disable {
		if err := grpcClient.ToggleAdBlock(ctx, false); err != nil {
			return fmt.Errorf("failed to disable adblock: %w", err)
		}
		fmt.Println("🛡️ Ad & Tracker Blocker disabled.")
		return nil
	}

	if *check != "" {
		res, err := grpcClient.CheckDomain(ctx, *check)
		if err != nil {
			return fmt.Errorf("failed to check domain: %w", err)
		}
		if res.Blocked {
			fmt.Printf("🚫 Domain '%s' is BLOCKED (Category: %s, Rule: %s)\n", *check, res.Category, res.MatchedRule)
		} else {
			fmt.Printf("✅ Domain '%s' is ALLOWED (Not blocked)\n", *check)
		}
		return nil
	}

	// Default: print stats
	stats, err := grpcClient.GetBlockStats(ctx)
	if err != nil {
		return err
	}

	fmt.Printf("🛡️ AdBlock Status: enabled=%v, total_blocked=%d, rules_count=%d, whitelist_count=%d\n",
		stats.Enabled, stats.TotalBlocked, stats.RulesCount, stats.WhitelistCount)

	return nil
}

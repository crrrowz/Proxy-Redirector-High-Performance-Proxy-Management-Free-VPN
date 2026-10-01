package commands

import (
	"context"
	"flag"
	"fmt"
	"log"
	"time"
)

func runStart(ctx context.Context, args []string) error {
	fs := flag.NewFlagSet("start", flag.ExitOnError)
	engineAddr := fs.String("engine", "", "Engine gRPC server address (e.g. 127.0.0.1:50051 or vps:50051)")
	apiKey := fs.String("key", "", "Engine API Key (pk_live_...)")
	socksPort := fs.Int("socks-port", 0, "Local SOCKS5 proxy server port (default 1080)")
	httpPort := fs.Int("http-port", 0, "Local HTTP proxy server port (default 8080)")
	country := fs.String("country", "", "ISO 2-letter country code filter (e.g. US, DE, GLOBAL)")
	maxSpeed := fs.Int("max-speed", 5000, "Maximum response time threshold in ms")
	surge := fs.Bool("surge", false, "Enable Surge Mode dynamic rotation immediately")
	surgeInterval := fs.Int("surge-interval", 30, "Surge rotation interval in seconds")
	poolSize := fs.Int("pool-size", 10, "Surge rotation pool size")

	if err := fs.Parse(args); err != nil {
		return err
	}

	c, err := initCore(ctx, *engineAddr, *apiKey, *socksPort, *httpPort)
	if err != nil {
		return err
	}

	fmt.Println("🚀 Starting Proxy Redirector Client...")
	fmt.Printf("   Engine: %s\n", c.Config.EngineAddress)
	fmt.Printf("   SOCKS5: 0.0.0.0:%d\n", c.Config.SOCKS5Port)
	fmt.Printf("   HTTP:   0.0.0.0:%d\n", c.Config.HTTPPort)
	if *country != "" {
		fmt.Printf("   Country Filter: %s\n", *country)
	}

	// 1. Connect core
	if err := c.Connect(*country, *maxSpeed); err != nil {
		return fmt.Errorf("failed to connect: %w", err)
	}

	// 2. Surge mode setup
	if *surge {
		fmt.Printf("⚡ Enabling Surge Mode (interval=%ds, pool_size=%d)...\n", *surgeInterval, *poolSize)
		if err := c.EnableRotation(*surgeInterval, []string{"socks5", "http"}, *country, *maxSpeed, *poolSize, false); err != nil {
			log.Printf("Warning: failed to enable surge mode: %v", err)
		}
	}

	// 3. Start proxy listeners
	go func() {
		if err := c.Socks5.Start(); err != nil {
			log.Printf("[SOCKS5] Server exited: %v", err)
		}
	}()

	go func() {
		if err := c.HTTPProxy.Start(); err != nil {
			log.Printf("[HTTP] Server exited: %v", err)
		}
	}()

	fmt.Println("\n✅ Proxy Redirector is active and listening.")
	fmt.Println("   Press Ctrl+C to disconnect and stop.")

	// 4. Background status ticker
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			fmt.Println("\n🛑 Shutting down gracefully...")
			c.Disconnect()
			c.Socks5.Stop()
			c.HTTPProxy.Stop()
			return nil

		case <-ticker.C:
			active, err := c.GetActiveProxy()
			if err == nil && active != nil && active.IP != "" {
				devices := len(c.GetConnectedDevices())
				fmt.Printf("[%s] Active: %s:%d (%s, %.0fms) | Connected LAN Devices: %d\n",
					time.Now().Format("15:04:05"),
					active.IP, active.Port, active.Country, active.Ping, devices)
			}
		}
	}
}

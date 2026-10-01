package main

import (
	"context"
	"flag"
	"log"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/crrrowz/proxy-redirector-v3/engine/internal/adblock"
	"github.com/crrrowz/proxy-redirector-v3/engine/internal/config"
	"github.com/crrrowz/proxy-redirector-v3/engine/internal/database"
	"github.com/crrrowz/proxy-redirector-v3/engine/internal/failover"
	"github.com/crrrowz/proxy-redirector-v3/engine/internal/proxy"
	"github.com/crrrowz/proxy-redirector-v3/engine/internal/server"
	"github.com/crrrowz/proxy-redirector-v3/shared/metadata"
)

func main() {
	configPath := flag.String("config", "engine_config.json", "Path to config file")
	flag.Parse()

	sysInfo := metadata.GetSystemInfo()
	log.Printf("Starting %s Engine v%s...", sysInfo.AppName, sysInfo.Version)

	// 1. Load Config
	cfg, err := config.LoadConfig(*configPath)
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// 2. Initialize Components
	dbLogger := slog.New(slog.NewTextHandler(os.Stderr, nil))
	sqliteDB, err := database.NewSQLiteDB("data/proxy_redirector.db", dbLogger)
	if err != nil {
		log.Printf("Notice: SQLite initialization: %v (falling back to memory/file)", err)
	} else {
		defer sqliteDB.Close()
		total, _, _, _ := sqliteDB.GetProxyCount()
		if total == 0 {
			importer := database.NewImporter(sqliteDB)
			if n, err := importer.ImportLegacyDataDirectory("data"); err == nil && n > 0 {
				log.Printf("Imported %d legacy proxies into SQLite database.", n)
			}
		}
	}

	adblockEngine := adblock.NewEngine(cfg.BlocklistFile)
	proxyManager := proxy.NewManager(cfg)
	
	_, err = proxyManager.LoadProxies()
	if err != nil {
		log.Printf("Warning: Failed to load proxies: %v", err)
	}
	
	failoverHandler := failover.NewHandler(proxyManager)

	// 3. Initial check to select best proxy
	log.Println("Performing initial proxy pool check...")
	proxies := proxyManager.GetUnchecked(cfg.DiscoveryBatchSize)
	if len(proxies) == 0 {
		proxies = proxyManager.GetAllProxies()
	}
	
	// Just check the first batch to get at least one alive
	if len(proxies) > 0 {
		batch := proxies
		if len(batch) > 100 {
			batch = batch[:100]
		}
		results := proxy.CheckBatch(context.Background(), batch, proxy.ConfigToCheckConfig(cfg))
		proxyManager.UpdateStatus(results)
	}
	
	if err := failoverHandler.Initialize(); err != nil {
		log.Printf("Warning: Failover init failed (no alive proxies): %v", err)
	} else {
		log.Printf("Selected initial proxy: %s", failoverHandler.CurrentProxy().IP)
	}

	// 4. Start gRPC Server
	grpcSrv := server.NewGRPCServer(proxyManager, failoverHandler, adblockEngine, cfg)
	go func() {
		log.Printf("gRPC Server listening on port %d", cfg.GRPCPort)
		if err := grpcSrv.Start(); err != nil {
			log.Fatalf("gRPC Server failed: %v", err)
		}
	}()

	// 5. Start REST API Server
	restSrv := server.NewRESTServer(proxyManager, failoverHandler, adblockEngine, cfg)
	go func() {
		log.Printf("REST API listening on port %d", cfg.RESTPort)
		if err := restSrv.Start(); err != nil && err.Error() != "http: Server closed" {
			log.Fatalf("REST API Server failed: %v", err)
		}
	}()

	// 6. Start Background Tasks
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	
	proxyFetcher := proxy.NewFetcher(proxyManager)
	go proxyFetcher.Start(ctx, cfg.FetchIntervalSec)
	
	go runMaintainPool(ctx, proxyManager, failoverHandler, cfg)

	// Wait for shutdown signal
	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt, syscall.SIGTERM)
	<-c

	log.Println("Shutting down Engine...")
	cancel()
	grpcSrv.Stop()
	restSrv.Stop()
	proxyManager.SaveSortedDataFile()
	log.Println("Engine stopped successfully.")
}

func runMaintainPool(ctx context.Context, manager *proxy.Manager, failover *failover.Handler, cfg *config.Config) {
	ticker := time.NewTicker(time.Duration(cfg.DiscoveryDelaySec) * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			// Check some unchecked proxies
			unchecked := manager.GetUnchecked(cfg.DiscoveryBatchSize)
			if len(unchecked) > 0 {
				results := proxy.CheckBatch(ctx, unchecked, proxy.ConfigToCheckConfig(cfg))
				manager.UpdateStatus(results)
			}

			// Retry some dead proxies
			retryable := manager.GetDeadForRetry()
			if len(retryable) > 0 {
				if len(retryable) > cfg.DiscoveryBatchSize {
					retryable = retryable[:cfg.DiscoveryBatchSize]
				}
				results := proxy.CheckBatch(ctx, retryable, proxy.ConfigToCheckConfig(cfg))
				manager.UpdateStatus(results)
			}

			// Update the failover best proxy just in case a better one appeared
			_ = failover.RefreshBest()
		}
	}
}

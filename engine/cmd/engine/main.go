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
	createKeyFlag := flag.Bool("create-key", false, "Generate a new API key and exit")
	listKeysFlag := flag.Bool("list-keys", false, "List all API keys and exit")
	keyNameFlag := flag.String("key-name", "Client Key", "Name for the new API key")
	keyRoleFlag := flag.String("role", "client", "Role for the new API key (admin, client, readonly)")
	flag.Parse()

	sysInfo := metadata.GetSystemInfo()

	// 1. Initialize SQLite Database
	dbLogger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelWarn}))
	_ = os.MkdirAll("data", 0755)
	sqliteDB, err := database.NewSQLiteDB("data/proxy_redirector.db", dbLogger)
	if err != nil {
		log.Printf("Notice: SQLite initialization: %v (running with limited database features)", err)
	} else {
		defer sqliteDB.Close()
	}

	// Handle standalone API key CLI operations
	if *createKeyFlag {
		if sqliteDB == nil {
			log.Fatalf("Cannot create key: database failed to initialize")
		}
		rec, err := sqliteDB.CreateAPIKey(*keyNameFlag, *keyRoleFlag)
		if err != nil {
			log.Fatalf("Failed to create API key: %v", err)
		}
		log.Printf("==================================================================")
		log.Printf("Created API Key Successfully!")
		log.Printf("Name: %s", rec.Name)
		log.Printf("Role: %s", rec.Role)
		log.Printf("Key:  %s", rec.Key)
		log.Printf("==================================================================")
		return
	}

	if *listKeysFlag {
		if sqliteDB == nil {
			log.Fatalf("Cannot list keys: database failed to initialize")
		}
		keys, err := sqliteDB.ListAPIKeys()
		if err != nil {
			log.Fatalf("Failed to list API keys: %v", err)
		}
		log.Printf("=========================== API KEYS =============================")
		for _, k := range keys {
			status := "ACTIVE"
			if k.Revoked {
				status = "REVOKED"
			}
			log.Printf("- [%s] %s | %s | Role: %s | Created: %s", status, k.Key, k.Name, k.Role, k.CreatedAt.Format(time.RFC3339))
		}
		log.Printf("==================================================================")
		return
	}

	log.Printf("Starting %s Engine v%s...", sysInfo.AppName, sysInfo.Version)

	// 2. Load Config
	cfg, err := config.LoadConfig(*configPath)
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	if sqliteDB != nil {
		masterRec, createdNew, err := sqliteDB.EnsureDefaultAPIKey()
		if err == nil && masterRec != nil {
			log.Printf("------------------------------------------------------------------")
			if createdNew {
				log.Printf("🔑 Master Admin API Key generated:")
			} else {
				log.Printf("🔑 Engine Master API Key:")
			}
			log.Printf("   Key: %s", masterRec.Key)
			log.Printf("   Role: %s", masterRec.Role)
			log.Printf("------------------------------------------------------------------")
		}

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
	grpcSrv := server.NewGRPCServer(proxyManager, failoverHandler, adblockEngine, cfg, sqliteDB)
	go func() {
		log.Printf("gRPC Server listening on port %d", cfg.GRPCPort)
		if err := grpcSrv.Start(); err != nil {
			log.Fatalf("gRPC Server failed: %v", err)
		}
	}()

	// 5. Start REST API Server
	restSrv := server.NewRESTServer(proxyManager, failoverHandler, adblockEngine, cfg, sqliteDB)
	go func() {
		log.Printf("REST API listening on port %d (http://localhost:%d)", cfg.RESTPort, cfg.RESTPort)
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

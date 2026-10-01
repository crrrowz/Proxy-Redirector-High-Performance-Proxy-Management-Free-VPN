package main

import (
	"context"
	"embed"
	"log"
	"time"

	"github.com/crrrowz/proxy-redirector-v3/client/internal/config"
	"github.com/crrrowz/proxy-redirector-v3/client/internal/engine"
	"github.com/crrrowz/proxy-redirector-v3/client/internal/proxy"
	"github.com/crrrowz/proxy-redirector-v3/shared/metadata"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	sysInfo := metadata.GetSystemInfo()
	log.Printf("Starting %s Client Core v%s (GUI Mode)...", sysInfo.AppName, sysInfo.Version)

	// 1. Load Config (In-Memory Defaults)
	cfg := config.LoadConfig()

	// 2. Start gRPC Client to Engine
	grpcClient := engine.NewGRPCClientWithKey(cfg.EngineAddress, cfg.APIKey)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	if err := grpcClient.Connect(ctx); err != nil {
		log.Printf("Failed to connect to engine: %v. Please make sure Engine.exe is running.", err)
	}
	cancel()
	defer grpcClient.Disconnect()

	// 3. Start Proxy Servers
	tracker := proxy.NewClientTracker()

	socks5Srv := proxy.NewSOCKS5Server(cfg.SOCKS5Port, grpcClient, tracker)
	go func() {
		if err := socks5Srv.Start(); err != nil {
			log.Printf("SOCKS5 Server failed: %v", err)
		}
	}()
	defer socks5Srv.Stop()

	httpSrv := proxy.NewHTTPProxyServer(cfg.HTTPPort, grpcClient, tracker)
	go func() {
		if err := httpSrv.Start(); err != nil {
			log.Printf("HTTP Proxy Server failed: %v", err)
		}
	}()
	defer httpSrv.Stop()

	// 4. Create an instance of the app structure
	app := NewApp(cfg, grpcClient, socks5Srv, httpSrv, tracker)

	// 5. Create application with options
	err := wails.Run(&options.App{
		Title:  sysInfo.AppName,
		Width:  600,
		Height: 700,
		MinWidth: 600,
		MinHeight: 400,
		MaxWidth: 600,
		MaxHeight: 1200,
		DisableResize: true,
		Frameless: true, // Frameless window
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 10, G: 14, B: 23, A: 255}, // #0a0e17
		OnStartup:        app.startup,
		OnShutdown:       app.shutdown,
		Bind: []interface{}{
			app,
		},
		Windows: &windows.Options{
			WebviewIsTransparent: true,
			WindowIsTranslucent:  false,
		},
	})

	if err != nil {
		log.Fatal("Error starting Wails app:", err)
	}
}

package main

import (
	"context"
	"log"

	"github.com/crrrowz/proxy-redirector-v3/client/internal/config"
	"github.com/crrrowz/proxy-redirector-v3/client/internal/core"
	"github.com/crrrowz/proxy-redirector-v3/client/internal/engine"
	"github.com/crrrowz/proxy-redirector-v3/client/internal/proxy"
	"github.com/crrrowz/proxy-redirector-v3/shared/metadata"
	"github.com/crrrowz/proxy-redirector-v3/shared/models"
	pb "github.com/crrrowz/proxy-redirector-v3/shared/pb"
)

type App struct {
	core *core.Core
}

func NewApp(cfg *config.Config, grpcClient *engine.GRPCClient, socks5 *proxy.SOCKS5Server, httpProxy *proxy.HTTPProxyServer, tracker *proxy.ClientTracker) *App {
	return &App{
		core: core.NewCore(cfg, grpcClient, socks5, httpProxy, tracker),
	}
}

func (a *App) startup(ctx context.Context) {
	a.core.SetContext(ctx)
	log.Println("Starting Client Core (GUI Mode)...")
}

func (a *App) shutdown(ctx context.Context) {
}

func (a *App) GetSystemInfo() metadata.SystemInfo {
	return a.core.GetSystemInfo()
}

func (a *App) Connect(country string, maxSpeed int) error {
	return a.core.Connect(country, maxSpeed)
}

func (a *App) Disconnect() error {
	return a.core.Disconnect()
}

func (a *App) GetEngineStatus() (*pb.EngineStatus, error) {
	return a.core.GetEngineStatus()
}

func (a *App) GetProxies(limit int32, country string) ([]*models.Proxy, error) {
	return a.core.GetProxies(limit, country)
}

func (a *App) ForceSwitch() error {
	return a.core.ForceSwitch()
}

func (a *App) GetActiveProxy() (*models.Proxy, error) {
	return a.core.GetActiveProxy()
}

func (a *App) GetSettings() map[string]interface{} {
	return a.core.GetSettings()
}

func (a *App) UpdateSettings(key, value interface{}) error {
	return a.core.UpdateSettings(key, value)
}

func (a *App) SaveConfig(engineIP string, socksPort int, httpPort int, username string, password string) error {
	return a.core.SaveConfig(engineIP, socksPort, httpPort, username, password)
}

func (a *App) GetLocalIPs() []string {
	return a.core.GetLocalIPs()
}

func (a *App) GetConnectedDevices() []proxy.ConnectedDevice {
	return a.core.GetConnectedDevices()
}

func (a *App) KickDevice(ip string) {
	a.core.KickDevice(ip)
}

func (a *App) GetRotationStatus() (*pb.RotationStatus, error) {
	return a.core.GetRotationStatus()
}

func (a *App) GetRotationPool() ([]*models.Proxy, error) {
	return a.core.GetRotationPool()
}

func (a *App) EnableRotation(interval int, types []string, country string, maxSpeed int, poolSize int, sslOnly bool) error {
	return a.core.EnableRotation(interval, types, country, maxSpeed, poolSize, sslOnly)
}

func (a *App) DisableRotation() error {
	return a.core.DisableRotation()
}

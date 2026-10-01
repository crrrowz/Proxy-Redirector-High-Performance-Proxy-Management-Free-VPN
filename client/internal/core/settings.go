package core

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/crrrowz/proxy-redirector-v3/client/internal/engine"
	"github.com/crrrowz/proxy-redirector-v3/shared/metadata"
)

func (c *Core) GetSystemInfo() metadata.SystemInfo {
	return metadata.GetSystemInfo()
}

func (c *Core) GetSettings() map[string]interface{} {
	return map[string]interface{}{
		"engine_address": c.Config.EngineAddress,
		"api_key":        c.Config.APIKey,
		"socks5_port":    c.Config.SOCKS5Port,
		"http_port":      c.Config.HTTPPort,
	}
}

func (c *Core) UpdateSettings(key, value interface{}) error {
	return nil
}

func (c *Core) SaveConfig(engineIP string, apiKey string, socksPort int, httpPort int) error {
	c.Config.EngineAddress = engineIP
	c.Config.APIKey = apiKey
	c.Config.SOCKS5Port = socksPort
	c.Config.HTTPPort = httpPort

	if err := c.Config.Save(); err != nil {
		log.Printf("Failed to save config: %v", err)
	}

	if err := c.GRPCClient.ReconnectWithAuth(engineIP, apiKey, "", ""); err != nil {
		log.Printf("Failed to reconnect to engine: %v", err)
		return err
	}

	return nil
}

// TestConnection verifies if a given Engine address and API key are reachable and valid.
func (c *Core) TestConnection(engineAddress, apiKey string) (map[string]interface{}, error) {
	tempClient := engine.NewGRPCClientWithKey(engineAddress, apiKey)
	ctx, cancel := context.WithTimeout(context.Background(), 4*time.Second)
	defer cancel()
	defer tempClient.Disconnect()

	if err := tempClient.Connect(ctx); err != nil {
		return nil, fmt.Errorf("connection failed: %w", err)
	}

	status, err := tempClient.GetEngineStatus(ctx)
	if err != nil {
		return nil, fmt.Errorf("authentication or status query failed: %w", err)
	}

	pool, err := tempClient.GetPoolSummary(ctx)
	aliveCount := int32(0)
	totalCount := int32(0)
	if err == nil && pool != nil {
		aliveCount = pool.Alive
		totalCount = pool.Total
	}

	return map[string]interface{}{
		"connected": true,
		"running":   status.Running,
		"mode":      status.Mode,
		"alive":     aliveCount,
		"total":     totalCount,
	}, nil
}

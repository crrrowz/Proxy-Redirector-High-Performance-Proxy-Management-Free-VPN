package core

import (
	"log"

	"github.com/crrrowz/proxy-redirector-v3/shared/metadata"
)

func (c *Core) GetSystemInfo() metadata.SystemInfo {
	return metadata.GetSystemInfo()
}

func (c *Core) GetSettings() map[string]interface{} {
	return map[string]interface{}{
		"engine_address": c.Config.EngineAddress,
		"socks5_port":    c.Config.SOCKS5Port,
		"http_port":      c.Config.HTTPPort,
		"auth_username":  c.Config.AuthUsername,
		"auth_password":  c.Config.AuthPassword,
	}
}

func (c *Core) UpdateSettings(key, value interface{}) error {
	return nil
}

func (c *Core) SaveConfig(engineIP string, socksPort int, httpPort int, username string, password string) error {
	c.Config.EngineAddress = engineIP
	c.Config.SOCKS5Port = socksPort
	c.Config.HTTPPort = httpPort
	c.Config.AuthUsername = username
	c.Config.AuthPassword = password

	if err := c.Config.Save(); err != nil {
		log.Printf("Failed to save config: %v", err)
	}

	if err := c.GRPCClient.Reconnect(engineIP, username, password); err != nil {
		log.Printf("Failed to reconnect to engine: %v", err)
		return err
	}

	return nil
}

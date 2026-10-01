package core

import (
	"context"
	"fmt"
	"net"

	"github.com/crrrowz/proxy-redirector-v3/client/internal/proxy"
)

func (c *Core) Connect(country string, maxSpeed int) error {
	updates := make(map[string]string)
	if country != "" {
		updates["CountryFilter"] = country
	} else {
		updates["CountryFilter"] = "GLOBAL"
	}
	updates["MaxSpeedMs"] = fmt.Sprintf("%d", maxSpeed)
	
	c.GRPCClient.UpdateConfig(context.Background(), updates)

	c.Socks5.Enable(true)
	c.HTTPProxy.Enable(true)
	return nil
}

func (c *Core) Disconnect() error {
	c.Socks5.Enable(false)
	c.HTTPProxy.Enable(false)
	return nil
}

func (c *Core) GetLocalIPs() []string {
	var ips []string
	ips = append(ips, "127.0.0.1")

	interfaces, err := net.Interfaces()
	if err != nil {
		return ips
	}
	
	for _, iface := range interfaces {
		if iface.Flags&net.FlagUp == 0 || iface.Flags&net.FlagLoopback != 0 {
			continue
		}

		name := iface.Name
		isVirtual := false
		lowerName := ""
		for _, char := range name {
			if char >= 'A' && char <= 'Z' {
				lowerName += string(char + 32)
			} else {
				lowerName += string(char)
			}
		}

		badKeywords := []string{"wsl", "vmware", "virtual", "veth", "docker", "tailscale", "npcap", "tun", "tap", "pseudo"}
		for _, bad := range badKeywords {
			if len(lowerName) >= len(bad) {
				for i := 0; i <= len(lowerName)-len(bad); i++ {
					if lowerName[i:i+len(bad)] == bad {
						isVirtual = true
						break
					}
				}
			}
			if isVirtual {
				break
			}
		}

		if isVirtual {
			continue
		}

		addrs, err := iface.Addrs()
		if err != nil {
			continue
		}

		for _, addr := range addrs {
			if ipnet, ok := addr.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
				if ipnet.IP.To4() != nil {
					ips = append(ips, ipnet.IP.String())
				}
			}
		}
	}
	return ips
}

func (c *Core) GetConnectedDevices() []proxy.ConnectedDevice {
	if c.Tracker != nil {
		return c.Tracker.GetDevices()
	}
	return []proxy.ConnectedDevice{}
}

func (c *Core) KickDevice(ip string) {
	if c.Tracker != nil {
		c.Tracker.Kick(ip)
	}
}

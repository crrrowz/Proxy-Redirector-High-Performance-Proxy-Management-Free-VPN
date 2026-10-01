package core

import (
	"context"

	"github.com/crrrowz/proxy-redirector-v3/client/internal/engine/pb"
	"github.com/crrrowz/proxy-redirector-v3/shared/models"
)

func (c *Core) GetRotationStatus() (*pb.RotationStatus, error) {
	return c.GRPCClient.GetRotationStatus(context.Background())
}

func (c *Core) GetRotationPool() ([]*models.Proxy, error) {
	resp, err := c.GRPCClient.GetRotationPool(context.Background())
	if err != nil {
		return nil, err
	}
	
	var list []*models.Proxy
	for _, rp := range resp.Proxies {
		list = append(list, &models.Proxy{
			IP:       rp.Ip,
			Port:     int(rp.Port),
			Type:     models.ProxyType(rp.Type),
			Country:  rp.Country,
			Ping:     rp.Ping,
		})
	}
	return list, nil
}

func (c *Core) EnableRotation(interval int, types []string, country string, maxSpeed int, poolSize int, sslOnly bool) error {
	return c.GRPCClient.EnableRotation(context.Background(), interval, types, country, maxSpeed, poolSize, sslOnly)
}

func (c *Core) DisableRotation() error {
	return c.GRPCClient.DisableRotation(context.Background())
}

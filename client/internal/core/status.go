package core

import (
	"context"

	"github.com/crrrowz/proxy-redirector-v3/shared/models"
	"github.com/crrrowz/proxy-redirector-v3/shared/pb"
)

func (c *Core) GetEngineStatus() (*pb.EngineStatus, error) {
	return c.GRPCClient.GetEngineStatus(context.Background())
}

func (c *Core) GetProxies(limit int32, country string) ([]*models.Proxy, error) {
	return c.GRPCClient.GetProxies(context.Background(), limit, country)
}

func (c *Core) ForceSwitch() error {
	return c.GRPCClient.ForceSwitch(context.Background())
}

func (c *Core) GetActiveProxy() (*models.Proxy, error) {
	return c.GRPCClient.GetActiveProxy(context.Background())
}

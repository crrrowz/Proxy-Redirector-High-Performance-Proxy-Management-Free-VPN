package tests

import (
	"context"
	"testing"
	"time"
)

func TestIntegration_E2E(t *testing.T) {
	c, cleanup := setupIntegration(t)
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	c.SetContext(ctx)

	// 1. Get Proxies sorted
	proxies, err := c.GetProxies(10, "GLOBAL")
	if err != nil {
		t.Fatalf("Failed to get proxies: %v", err)
	}
	if len(proxies) == 0 {
		t.Fatalf("Expected proxies to be returned")
	}
	
	// 2. Connect logic (triggers UpdateConfig)
	err = c.Connect("US", 100)
	if err != nil {
		t.Fatalf("Failed to connect: %v", err)
	}

	// 3. Failover / Active Proxy
	active, err := c.GetActiveProxy()
	if err != nil {
		t.Fatalf("Failed to get active proxy: %v", err)
	}
	if active.IP != "192.168.1.1" {
		t.Errorf("Expected active proxy to be 192.168.1.1, got %v", active.IP)
	}

	// 4. Rotation enable/disable
	rotStatus, err := c.GetRotationStatus()
	if err != nil {
		t.Fatalf("Failed to get rotation status: %v", err)
	}
	if !rotStatus.Enabled {
		t.Errorf("Expected rotation to be enabled in mock")
	}
}

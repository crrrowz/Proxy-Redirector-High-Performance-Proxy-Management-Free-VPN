// Package utils provides shared network utilities.
package utils

import (
	"fmt"
	"net"
	"strings"
)

// GetLocalIPs returns all non-loopback IPv4 addresses on this machine.
func GetLocalIPs() []string {
	var ips []string
	addrs, err := net.InterfaceAddrs()
	if err != nil {
		return ips
	}
	for _, addr := range addrs {
		if ipnet, ok := addr.(*net.IPNet); ok && !ipnet.IP.IsLoopback() && ipnet.IP.To4() != nil {
			ips = append(ips, ipnet.IP.String())
		}
	}
	return ips
}

// IsLocalIP checks if an IP belongs to a local/private network.
func IsLocalIP(ip string) bool {
	parsed := net.ParseIP(ip)
	if parsed == nil {
		return false
	}
	privateRanges := []string{
		"10.0.0.0/8",
		"172.16.0.0/12",
		"192.168.0.0/16",
		"127.0.0.0/8",
	}
	for _, cidr := range privateRanges {
		_, network, _ := net.ParseCIDR(cidr)
		if network.Contains(parsed) {
			return true
		}
	}
	return false
}

// IsWhitelisted checks if an IP matches any of the whitelist prefixes.
func IsWhitelisted(ip string, whitelist []string) bool {
	for _, prefix := range whitelist {
		if strings.HasPrefix(ip, prefix) {
			return true
		}
	}
	return false
}

// FormatBytes returns a human-readable byte size string.
func FormatBytes(b int64) string {
	const unit = 1024
	if b < unit {
		return fmt.Sprintf("%d B", b)
	}
	div, exp := int64(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	val := float64(b) / float64(div)
	units := []string{"KB", "MB", "GB", "TB"}
	if val >= 100 {
		return fmt.Sprintf("%.0f %s", val, units[exp])
	}
	if val >= 10 {
		return fmt.Sprintf("%.1f %s", val, units[exp])
	}
	return fmt.Sprintf("%.2f %s", val, units[exp])
}

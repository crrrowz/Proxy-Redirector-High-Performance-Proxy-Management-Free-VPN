package metadata

import (
	"encoding/json"
	_ "embed"
	"log"
)

//go:embed system.json
var systemJSON []byte

type UIInfo struct {
	ThemeColor  string `json:"theme_color"`
	PrimaryFont string `json:"primary_font"`
}

type SystemInfo struct {
	AppName      string `json:"app_name"`
	Version      string `json:"version"`
	Description  string `json:"description"`
	Manufacturer string `json:"manufacturer"`
	Website      string `json:"website"`
	SupportEmail string `json:"support_email"`
	Copyright    string `json:"copyright"`
	UI           UIInfo `json:"ui"`
}

var currentSystemInfo SystemInfo

func init() {
	if err := json.Unmarshal(systemJSON, &currentSystemInfo); err != nil {
		log.Fatalf("Failed to parse embedded system.json: %v", err)
	}
}

// GetSystemInfo returns the unified system metadata.
func GetSystemInfo() SystemInfo {
	return currentSystemInfo
}

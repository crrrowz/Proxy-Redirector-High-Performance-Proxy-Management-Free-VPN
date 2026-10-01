// Package utils provides shared utilities for Engine and Client.
package utils

import (
	"io"
	"log/slog"
	"os"
	"path/filepath"
)

// SetupLogger creates a configured slog.Logger.
//   - level: "debug", "info", "warn", "error"
//   - logFile: path to log file (empty = console only)
//   - jsonFormat: true for JSON output (production), false for text (dev)
func SetupLogger(level string, logFile string, jsonFormat bool) *slog.Logger {
	var lvl slog.Level
	switch level {
	case "debug":
		lvl = slog.LevelDebug
	case "info":
		lvl = slog.LevelInfo
	case "warn":
		lvl = slog.LevelWarn
	case "error":
		lvl = slog.LevelError
	default:
		lvl = slog.LevelInfo
	}

	var writer io.Writer = os.Stderr
	if logFile != "" {
		dir := filepath.Dir(logFile)
		if dir != "" && dir != "." {
			os.MkdirAll(dir, 0755)
		}
		f, err := os.OpenFile(logFile, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
		if err == nil {
			writer = io.MultiWriter(os.Stderr, f)
		}
	}

	opts := &slog.HandlerOptions{Level: lvl}
	var handler slog.Handler
	if jsonFormat {
		handler = slog.NewJSONHandler(writer, opts)
	} else {
		handler = slog.NewTextHandler(writer, opts)
	}

	return slog.New(handler)
}

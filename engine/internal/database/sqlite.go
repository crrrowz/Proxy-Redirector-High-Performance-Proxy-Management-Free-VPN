package database

import (
	"database/sql"
	"fmt"
	"log/slog"
	"strings"
	"time"

	_ "modernc.org/sqlite"

	"github.com/crrrowz/proxy-redirector-v3/shared/models"
)

// SQLiteDB implements the DB interface for self-hosted mode.
type SQLiteDB struct {
	db     *sql.DB
	logger *slog.Logger
}

// NewSQLiteDB opens (or creates) a SQLite database at the given path.
func NewSQLiteDB(path string, logger *slog.Logger) (*SQLiteDB, error) {
	db, err := sql.Open("sqlite", path+"?_journal_mode=WAL&_busy_timeout=5000")
	if err != nil {
		return nil, fmt.Errorf("sqlite open: %w", err)
	}
	db.SetMaxOpenConns(1) // SQLite single-writer

	s := &SQLiteDB{db: db, logger: logger}
	if err := s.Migrate(); err != nil {
		db.Close()
		return nil, fmt.Errorf("sqlite migrate: %w", err)
	}

	return s, nil
}

// Migrate creates the schema if it doesn't exist.
func (s *SQLiteDB) Migrate() error {
	_, err := s.db.Exec(schemaSQLite)
	return err
}

// Close closes the database connection.
func (s *SQLiteDB) Close() error {
	return s.db.Close()
}

// ---------------------------------------------------------------------------
// Proxies
// ---------------------------------------------------------------------------

// SaveProxies upserts proxies and their statuses into the database.
func (s *SQLiteDB) SaveProxies(proxies []*models.Proxy, statuses map[string]*models.ProxyStatus) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(`
		INSERT INTO proxies (id, ip, port, type, username, password, country, city,
			alive, speed_ms, score, ssl_verified, consecutive_failures,
			total_checks, total_successes, blacklisted, last_checked, last_alive)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			alive=excluded.alive, speed_ms=excluded.speed_ms, score=excluded.score,
			ssl_verified=excluded.ssl_verified, consecutive_failures=excluded.consecutive_failures,
			total_checks=excluded.total_checks, total_successes=excluded.total_successes,
			blacklisted=excluded.blacklisted, last_checked=excluded.last_checked,
			last_alive=excluded.last_alive
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	for _, p := range proxies {
		id := p.GenerateID()
		st := statuses[id]
		var alive bool
		var speedMs, score float64
		var sslVerified, blacklisted bool
		var consecFail, totalChecks, totalSucc int
		var lastChecked, lastAlive string

		if st != nil {
			alive = st.Alive
			speedMs = st.ResponseTimeMs
			score = st.Score
			sslVerified = st.SSLVerified
			blacklisted = st.Blacklisted
			consecFail = st.ConsecutiveFailures
			totalChecks = st.TotalChecks
			totalSucc = st.TotalSuccesses
			if !st.LastChecked.IsZero() {
				lastChecked = st.LastChecked.Format(time.RFC3339)
			}
			if !st.LastAlive.IsZero() {
				lastAlive = st.LastAlive.Format(time.RFC3339)
			}
		}

		_, err := stmt.Exec(
			id, p.IP, p.Port, string(p.Type), p.Username, p.Password, p.Country, p.City,
			alive, speedMs, score, sslVerified, consecFail,
			totalChecks, totalSucc, blacklisted, lastChecked, lastAlive,
		)
		if err != nil {
			s.logger.Warn("save proxy failed", "id", id, "error", err)
		}
	}

	return tx.Commit()
}

// GetProxies retrieves proxies matching the given filters.
func (s *SQLiteDB) GetProxies(filters ProxyFilters) ([]ProxyRecord, error) {
	query := "SELECT id, ip, port, type, username, password, country, city, alive, speed_ms, score, ssl_verified, consecutive_failures, total_checks, total_successes, blacklisted, last_checked, last_alive, created_at FROM proxies"

	var conditions []string
	var args []interface{}

	if filters.AliveOnly {
		conditions = append(conditions, "alive = 1")
	}
	if filters.ExcludeDead {
		conditions = append(conditions, "blacklisted = 0")
	}
	if filters.Country != "" && filters.Country != "GLOBAL" {
		conditions = append(conditions, "country = ?")
		args = append(args, filters.Country)
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}

	query += " ORDER BY score DESC"

	if filters.Limit > 0 {
		query += fmt.Sprintf(" LIMIT %d", filters.Limit)
	}

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var records []ProxyRecord
	for rows.Next() {
		var r ProxyRecord
		var lastChecked, lastAlive, createdAt sql.NullString
		err := rows.Scan(
			&r.ID, &r.IP, &r.Port, &r.Type, &r.Username, &r.Password,
			&r.Country, &r.City, &r.Alive, &r.SpeedMs, &r.Score,
			&r.SSLVerified, &r.ConsecutiveFailures, &r.TotalChecks,
			&r.TotalSuccesses, &r.Blacklisted, &lastChecked, &lastAlive, &createdAt,
		)
		if err != nil {
			s.logger.Warn("scan proxy row failed", "error", err)
			continue
		}
		if lastChecked.Valid {
			r.LastChecked, _ = time.Parse(time.RFC3339, lastChecked.String)
		}
		if lastAlive.Valid {
			r.LastAlive, _ = time.Parse(time.RFC3339, lastAlive.String)
		}
		if createdAt.Valid {
			r.CreatedAt, _ = time.Parse(time.RFC3339, createdAt.String)
		}
		records = append(records, r)
	}
	return records, rows.Err()
}

// UpdateProxyStatus updates a single proxy's status fields.
func (s *SQLiteDB) UpdateProxyStatus(id string, status *models.ProxyStatus) error {
	var lastChecked, lastAlive string
	if !status.LastChecked.IsZero() {
		lastChecked = status.LastChecked.Format(time.RFC3339)
	}
	if !status.LastAlive.IsZero() {
		lastAlive = status.LastAlive.Format(time.RFC3339)
	}

	_, err := s.db.Exec(`
		UPDATE proxies SET
			alive=?, speed_ms=?, score=?, ssl_verified=?,
			consecutive_failures=?, total_checks=?, total_successes=?,
			blacklisted=?, last_checked=?, last_alive=?
		WHERE id=?`,
		status.Alive, status.ResponseTimeMs, status.Score, status.SSLVerified,
		status.ConsecutiveFailures, status.TotalChecks, status.TotalSuccesses,
		status.Blacklisted, lastChecked, lastAlive, id,
	)
	return err
}

// GetProxyCount returns aggregate counts.
func (s *SQLiteDB) GetProxyCount() (total, alive, dead int, err error) {
	err = s.db.QueryRow("SELECT COUNT(*) FROM proxies").Scan(&total)
	if err != nil {
		return
	}
	err = s.db.QueryRow("SELECT COUNT(*) FROM proxies WHERE alive = 1").Scan(&alive)
	if err != nil {
		return
	}
	dead = total - alive
	return
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

// SaveAnalytics upserts an analytics record.
func (s *SQLiteDB) SaveAnalytics(record *AnalyticsRecord) error {
	_, err := s.db.Exec(`
		INSERT INTO analytics (proxy_id, avg_speed_ms, min_speed_ms, max_speed_ms,
			uptime_pct, reliability_score, tags, total_checks, total_successes)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(proxy_id) DO UPDATE SET
			avg_speed_ms=excluded.avg_speed_ms, min_speed_ms=excluded.min_speed_ms,
			max_speed_ms=excluded.max_speed_ms, uptime_pct=excluded.uptime_pct,
			reliability_score=excluded.reliability_score, tags=excluded.tags,
			total_checks=excluded.total_checks, total_successes=excluded.total_successes`,
		record.ProxyID, record.AvgSpeedMs, record.MinSpeedMs, record.MaxSpeedMs,
		record.UptimePct, record.ReliabilityScore, record.Tags,
		record.TotalChecks, record.TotalSuccesses,
	)
	return err
}

// GetAnalytics retrieves analytics for a specific proxy.
func (s *SQLiteDB) GetAnalytics(proxyID string) (*AnalyticsRecord, error) {
	var r AnalyticsRecord
	err := s.db.QueryRow(`
		SELECT proxy_id, avg_speed_ms, min_speed_ms, max_speed_ms,
			uptime_pct, reliability_score, tags, total_checks, total_successes
		FROM analytics WHERE proxy_id = ?`, proxyID,
	).Scan(&r.ProxyID, &r.AvgSpeedMs, &r.MinSpeedMs, &r.MaxSpeedMs,
		&r.UptimePct, &r.ReliabilityScore, &r.Tags,
		&r.TotalChecks, &r.TotalSuccesses,
	)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

// GetTopProxies returns the top N proxies by reliability score.
func (s *SQLiteDB) GetTopProxies(limit int) ([]AnalyticsRecord, error) {
	rows, err := s.db.Query(`
		SELECT proxy_id, avg_speed_ms, min_speed_ms, max_speed_ms,
			uptime_pct, reliability_score, tags, total_checks, total_successes
		FROM analytics ORDER BY reliability_score DESC LIMIT ?`, limit,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var records []AnalyticsRecord
	for rows.Next() {
		var r AnalyticsRecord
		if err := rows.Scan(&r.ProxyID, &r.AvgSpeedMs, &r.MinSpeedMs, &r.MaxSpeedMs,
			&r.UptimePct, &r.ReliabilityScore, &r.Tags,
			&r.TotalChecks, &r.TotalSuccesses,
		); err != nil {
			continue
		}
		records = append(records, r)
	}
	return records, rows.Err()
}

// ---------------------------------------------------------------------------
// Config (key-value)
// ---------------------------------------------------------------------------

// GetConfigValue retrieves a single config value by key.
func (s *SQLiteDB) GetConfigValue(key string) (string, error) {
	var value string
	err := s.db.QueryRow("SELECT value FROM config WHERE key = ?", key).Scan(&value)
	return value, err
}

// SetConfigValue sets a config key-value pair (upsert).
func (s *SQLiteDB) SetConfigValue(key, value string) error {
	_, err := s.db.Exec(`
		INSERT INTO config (key, value, updated_at) VALUES (?, ?, datetime('now'))
		ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=datetime('now')`,
		key, value,
	)
	return err
}

// GetAllConfig returns all config key-value pairs.
func (s *SQLiteDB) GetAllConfig() (map[string]string, error) {
	rows, err := s.db.Query("SELECT key, value FROM config")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	m := make(map[string]string)
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			continue
		}
		m[k] = v
	}
	return m, rows.Err()
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const schemaSQLite = `
CREATE TABLE IF NOT EXISTS proxies (
    id TEXT PRIMARY KEY,
    ip TEXT NOT NULL,
    port INTEGER NOT NULL,
    type TEXT NOT NULL,
    username TEXT DEFAULT '',
    password TEXT DEFAULT '',
    country TEXT DEFAULT '',
    city TEXT DEFAULT '',
    alive INTEGER DEFAULT 0,
    speed_ms REAL DEFAULT 0,
    score REAL DEFAULT 0,
    ssl_verified INTEGER DEFAULT 0,
    consecutive_failures INTEGER DEFAULT 0,
    total_checks INTEGER DEFAULT 0,
    total_successes INTEGER DEFAULT 0,
    blacklisted INTEGER DEFAULT 0,
    last_checked TEXT DEFAULT '',
    last_alive TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS analytics (
    proxy_id TEXT PRIMARY KEY,
    avg_speed_ms REAL DEFAULT 0,
    min_speed_ms REAL DEFAULT 0,
    max_speed_ms REAL DEFAULT 0,
    uptime_pct REAL DEFAULT 0,
    reliability_score REAL DEFAULT 0,
    tags TEXT DEFAULT '[]',
    total_checks INTEGER DEFAULT 0,
    total_successes INTEGER DEFAULT 0,
    FOREIGN KEY (proxy_id) REFERENCES proxies(id)
);

CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
);
`

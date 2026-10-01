# 🗄️ Engine Module: Database Schema

> **ملفات Go المستهدفة:**
> - `engine/internal/database/sqlite.go` — Self-hosted mode
> - `engine/internal/database/postgres.go` — SaaS mode
> - `engine/internal/database/migrations/` — SQL migrations

---

## Database Interface

```go
// DB هو الواجهة المشتركة بين SQLite و PostgreSQL
type DB interface {
    // Users
    CreateUser(email, hashedPassword, role string) (*User, error)
    GetUserByEmail(email string) (*User, error)
    GetUserByID(id string) (*User, error)
    UpdateUser(id string, updates map[string]interface{}) error
    BanUser(id string) error
    ListUsers(page, perPage int, filters UserFilters) ([]User, int, error)
    
    // Devices
    RegisterDevice(userID, fingerprint, name, os string) (*Device, error)
    GetDevicesByUser(userID string) ([]Device, error)
    DeleteDevice(id string) error
    GetDeviceCount(userID string) (int, error)
    
    // Sessions
    CreateSession(userID, deviceID, region, protocol string) (*Session, error)
    EndSession(sessionID string, bytesUp, bytesDown int64) error
    GetActiveSession(userID string) (*Session, error)
    
    // Proxies
    SaveProxies(proxies []Proxy) error
    GetProxies(filters ProxyFilters) ([]Proxy, error)
    UpdateProxyStatus(id string, status ProxyStatus) error
    
    // Usage
    RecordUsage(sessionID string, bytesUp, bytesDown int64) error
    GetUsage(userID string, period string) (*UsageData, error)
    GetBandwidthRemaining(userID string) (float64, error)
    
    // Subscriptions (SaaS)
    GetSubscription(userID string) (*Subscription, error)
    CreateSubscription(userID, planID, stripeSubID string) error
    UpdateSubscription(id string, updates map[string]interface{}) error
    CancelSubscription(id string) error
    
    // Plans (SaaS)
    GetPlans() ([]Plan, error)
    GetPlanByID(id string) (*Plan, error)
    
    // Audit (SaaS)
    LogAudit(actorID, action, details string) error
    GetAuditLog(filters AuditFilters) ([]AuditEntry, error)
    
    // Lifecycle
    Migrate() error
    Close() error
}
```

---

## SQLite Schema (Self-Hosted)

بسيط — يخزّن فقط حالة البروكسيات والإعدادات:

```sql
CREATE TABLE IF NOT EXISTS proxies (
    id TEXT PRIMARY KEY,                -- "ip_port"
    ip TEXT NOT NULL,
    port INTEGER NOT NULL,
    type TEXT NOT NULL,                 -- socks5/http/...
    username TEXT,
    password TEXT,
    country TEXT,
    city TEXT,
    alive INTEGER DEFAULT 0,
    speed_ms REAL,
    score REAL DEFAULT 0,
    ssl_verified INTEGER DEFAULT 0,
    consecutive_failures INTEGER DEFAULT 0,
    total_checks INTEGER DEFAULT 0,
    total_successes INTEGER DEFAULT 0,
    blacklisted INTEGER DEFAULT 0,
    last_checked TEXT,
    last_alive TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS analytics (
    proxy_id TEXT PRIMARY KEY,
    avg_speed_ms REAL,
    min_speed_ms REAL,
    max_speed_ms REAL,
    uptime_pct REAL,
    reliability_score REAL,
    tags TEXT,                          -- JSON array
    total_checks INTEGER DEFAULT 0,
    total_successes INTEGER DEFAULT 0,
    FOREIGN KEY (proxy_id) REFERENCES proxies(id)
);

CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now'))
);
```

---

## PostgreSQL Schema (SaaS)

### Users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'client',          -- super_admin, admin, reseller, client
    status VARCHAR(20) DEFAULT 'pending',       -- pending, active, banned, suspended
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
```

### Plans
```sql
CREATE TABLE plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,           -- free, basic, pro, business
    display_name VARCHAR(100) NOT NULL,
    price_monthly_cents INTEGER NOT NULL,
    price_yearly_cents INTEGER NOT NULL,
    bandwidth_gb INTEGER NOT NULL,              -- -1 = unlimited
    max_devices INTEGER NOT NULL,
    max_regions INTEGER NOT NULL,               -- -1 = all
    features JSONB,                             -- {"adblock": true, "priority_support": false}
    stripe_monthly_price_id VARCHAR(255),
    stripe_yearly_price_id VARCHAR(255),
    active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Default Plans
```sql
INSERT INTO plans (name, display_name, price_monthly_cents, price_yearly_cents, bandwidth_gb, max_devices, max_regions, features) VALUES
('free', 'Free', 0, 0, 0.5, 1, 2, '{"adblock": false}'),
('basic', 'Basic', 500, 4800, 50, 2, 5, '{"adblock": true}'),
('pro', 'Pro', 1200, 11520, 200, 5, -1, '{"adblock": true, "priority_support": true}'),
('business', 'Business', 3000, 28800, -1, 20, -1, '{"adblock": true, "priority_support": true, "api_access": true}');
```

### Subscriptions
```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    plan_id UUID NOT NULL REFERENCES plans(id),
    status VARCHAR(20) DEFAULT 'active',        -- active, canceled, expired, past_due
    interval VARCHAR(10) NOT NULL,              -- monthly, yearly
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    bandwidth_used_bytes BIGINT DEFAULT 0,
    canceled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_subs_user ON subscriptions(user_id);
CREATE INDEX idx_subs_stripe ON subscriptions(stripe_subscription_id);
```

### Devices
```sql
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    fingerprint VARCHAR(64) NOT NULL,
    name VARCHAR(100),
    os VARCHAR(50),
    last_ip VARCHAR(45),
    last_active TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, fingerprint)
);
CREATE INDEX idx_devices_user ON devices(user_id);
```

### Sessions
```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    device_id UUID REFERENCES devices(id),
    relay_id UUID REFERENCES relay_servers(id),
    region VARCHAR(10),
    protocol VARCHAR(10),
    status VARCHAR(20) DEFAULT 'active',        -- active, closed, expired
    bytes_up BIGINT DEFAULT 0,
    bytes_down BIGINT DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    session_token TEXT
);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_status ON sessions(status);
```

### Usage Logs
```sql
CREATE TABLE usage_logs (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES sessions(id),
    user_id UUID NOT NULL REFERENCES users(id),
    bytes_up BIGINT NOT NULL,
    bytes_down BIGINT NOT NULL,
    interval_seconds INTEGER NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_usage_session ON usage_logs(session_id);
CREATE INDEX idx_usage_user_date ON usage_logs(user_id, recorded_at);
```

### Relay Servers
```sql
CREATE TABLE relay_servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hostname VARCHAR(255) NOT NULL,
    ip VARCHAR(45) NOT NULL,
    region VARCHAR(10) NOT NULL,
    city VARCHAR(100),
    port INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'active',        -- active, maintenance, offline
    max_connections INTEGER DEFAULT 1000,
    current_connections INTEGER DEFAULT 0,
    load_pct INTEGER DEFAULT 0,
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_relay_region ON relay_servers(region);
CREATE INDEX idx_relay_status ON relay_servers(status);
```

### Proxies (managed)
```sql
CREATE TABLE proxies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip VARCHAR(45) NOT NULL,
    port INTEGER NOT NULL,
    type VARCHAR(10) NOT NULL,
    username VARCHAR(255),
    password VARCHAR(255),
    country VARCHAR(10),
    city VARCHAR(100),
    alive BOOLEAN DEFAULT false,
    speed_ms REAL,
    score REAL DEFAULT 0,
    ssl_verified BOOLEAN DEFAULT false,
    consecutive_failures INTEGER DEFAULT 0,
    blacklisted BOOLEAN DEFAULT false,
    last_checked TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ip, port)
);
CREATE INDEX idx_proxies_country ON proxies(country);
CREATE INDEX idx_proxies_alive ON proxies(alive);
```

### Audit Log
```sql
CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    actor_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,               -- user.login, user.ban, subscription.create, ...
    details JSONB,
    ip VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_action ON audit_log(action);
```

---

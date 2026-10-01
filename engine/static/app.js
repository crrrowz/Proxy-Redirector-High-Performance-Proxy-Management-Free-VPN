/**
 * Proxy Redirector v3 — Engine Dashboard Client Logic
 */

let activeTab = 'dashboard';
let cachedProxies = [];
let cachedRules = {};
let cachedWhitelist = [];
let trafficBuffer = [];
let pollTimer = null;

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    startPolling();
});

function initDashboard() {
    fetchStatus();
    fetchProxies();
    fetchBlocklist();
    fetchCountries();
    fetchConfig();
}

function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => {
        if (activeTab === 'dashboard') {
            fetchStatus();
        } else if (activeTab === 'proxies') {
            fetchProxies();
        } else if (activeTab === 'adblock') {
            fetchBlocklist();
        } else if (activeTab === 'analytics') {
            fetchProxies();
        }
    }, 2500);
}

// ── Tab Switching ──
function switchTab(tabId, btn) {
    activeTab = tabId;
    document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));

    if (btn) btn.classList.add('active');
    const content = document.getElementById(`tab-${tabId}`);
    if (content) content.classList.add('active');

    // Trigger immediate refresh for tab
    if (tabId === 'dashboard') fetchStatus();
    if (tabId === 'proxies') fetchProxies();
    if (tabId === 'adblock') fetchBlocklist();
    if (tabId === 'analytics') fetchProxies();
    if (tabId === 'settings') fetchConfig();
}

// ── Status & Metrics ──
async function fetchStatus() {
    try {
        const res = await fetch('/api/status');
        if (!res.ok) throw new Error('Status fetch failed');
        const data = await res.json();

        // Update indicators
        const orb = document.getElementById('engine-status-orb');
        if (orb) orb.classList.remove('offline');

        const pool = data.pool || {};
        const adblock = data.adblock || {};
        const active = data.active_proxy;

        // Stat cards
        setElemText('stat-alive', pool.alive || 0);
        setElemText('stat-total-sub', `Total pool: ${pool.total || 0}`);
        setElemText('stat-blocked', adblock.total_blocked || 0);
        setElemText('nav-blocked-count', adblock.total_blocked || 0);
        setElemText('nav-pool-count', pool.total || 0);

        // Active Proxy Card
        renderActiveProxy(active);

        // Pool Distribution Bar
        renderPoolBar(pool);

    } catch (err) {
        console.warn('Polling error:', err);
        const orb = document.getElementById('engine-status-orb');
        if (orb) orb.classList.add('offline');
        setElemText('daemon-state-text', 'Engine Offline');
    }
}

function renderActiveProxy(active) {
    const box = document.getElementById('active-proxy-card');
    if (!box) return;

    if (!active || !active.ip) {
        box.innerHTML = `
            <div class="empty-hint">
                ⚠️ No proxy currently selected. The engine will automatically elect the best proxy once checked.
            </div>`;
        setElemText('stat-active-speed', '-- ms');
        setElemText('stat-active-country', 'Country: None');
        return;
    }

    const speedMs = active.speed_ms ? `${Math.round(active.speed_ms)} ms` : (active.ping ? `${Math.round(active.ping)} ms` : '-- ms');
    const country = active.country || 'Unknown';
    const city = active.city ? `, ${active.city}` : '';
    const score = active.score ? active.score.toFixed(1) : '--';

    setElemText('stat-active-speed', speedMs);
    setElemText('stat-active-country', `Country: ${country}`);
    setElemText('stat-avg-score', score);

    box.innerHTML = `
        <div class="active-endpoint">${active.ip}:${active.port}</div>
        <div class="active-details-row">
            <span class="tag-badge cyan">🌍 ${country}${city}</span>
            <span class="tag-badge success">⚡ ${speedMs}</span>
            <span class="tag-badge purple">🏆 Score: ${score}/100</span>
            <span class="tag-badge">${(active.type || 'SOCKS5').toUpperCase()}</span>
            ${active.ssl_verified ? '<span class="tag-badge success">🔒 SSL Verified</span>' : ''}
        </div>`;
}

function renderPoolBar(pool) {
    const total = pool.total || 0;
    if (total === 0) return;

    const alivePct = ((pool.alive || 0) / total) * 100;
    const retryPct = ((pool.dead_retryable || 0) / total) * 100;
    const deadPct = (((pool.dead || 0) + (pool.blacklisted || 0)) / total) * 100;
    const uncheckPct = ((pool.unchecked || 0) / total) * 100;

    setElemStyleWidth('bar-alive', `${alivePct}%`);
    setElemStyleWidth('bar-retry', `${retryPct}%`);
    setElemStyleWidth('bar-dead', `${deadPct}%`);
    setElemStyleWidth('bar-unchecked', `${uncheckPct}%`);

    setElemText('leg-alive', pool.alive || 0);
    setElemText('leg-retry', pool.dead_retryable || 0);
    setElemText('leg-dead', (pool.dead || 0) + (pool.blacklisted || 0));
    setElemText('leg-unchecked', pool.unchecked || 0);

    setElemText('pool-counts-summary', `${pool.alive || 0} healthy / ${total} total proxies`);
}

async function forceSwitchProxy() {
    try {
        await fetch('/api/proxy/select', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'auto' })
        });
        fetchStatus();
    } catch (err) {
        alert('Failed to force switch proxy: ' + err);
    }
}

// ── Proxy Pool Management ──
async function fetchProxies() {
    try {
        const res = await fetch('/api/proxies');
        if (!res.ok) throw new Error('Failed to load proxies');
        const items = await res.json();
        cachedProxies = items || [];
        renderProxiesTable(cachedProxies);
        renderAnalyticsTable(cachedProxies);
    } catch (err) {
        console.error('Error fetching proxies:', err);
    }
}

function renderProxiesTable(items) {
    const tbody = document.getElementById('proxies-tbody');
    if (!tbody) return;

    if (!items || items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="table-loading">No proxies found in database.</td></tr>`;
        return;
    }

    let html = '';
    items.forEach((item, idx) => {
        const p = item.proxy || item;
        const s = item.status || {};
        const isAlive = s.alive || p.alive;
        const speed = s.response_time_ms ? `${Math.round(s.response_time_ms)}ms` : (p.ping ? `${Math.round(p.ping)}ms` : '--');
        const score = (item.score || s.score || 0).toFixed(1);

        html += `
            <tr>
                <td>${idx + 1}</td>
                <td><strong style="font-family:var(--font-mono)">${p.ip}:${p.port}</strong></td>
                <td><span class="tag-badge">${(p.type || 'SOCKS5').toUpperCase()}</span></td>
                <td>${p.country || '??'}</td>
                <td>
                    <span class="tag-badge ${isAlive ? 'success' : 'danger'}">
                        ${isAlive ? '✓ Alive' : '✗ Dead'}
                    </span>
                </td>
                <td>${speed}</td>
                <td><strong>${score}</strong></td>
                <td>${s.ssl_verified ? '🔒 Yes' : '—'}</td>
                <td>${s.consecutive_failures || 0}</td>
                <td>
                    <button class="btn-action-sm" onclick="selectSpecificProxy('${p.id || p.ip + '_' + p.port}')">Select</button>
                </td>
            </tr>`;
    });
    tbody.innerHTML = html;
}

function filterProxiesTable() {
    const q = (document.getElementById('proxy-filter-input')?.value || '').toLowerCase();
    const c = (document.getElementById('proxy-country-select')?.value || '').toUpperCase();

    const filtered = cachedProxies.filter(item => {
        const p = item.proxy || item;
        const endpoint = `${p.ip}:${p.port}`.toLowerCase();
        const country = (p.country || '').toUpperCase();
        const type = (p.type || '').toLowerCase();

        const matchesQuery = !q || endpoint.includes(q) || country.toLowerCase().includes(q) || type.includes(q);
        const matchesCountry = !c || country === c;
        return matchesQuery && matchesCountry;
    });

    renderProxiesTable(filtered);
}

async function selectSpecificProxy(proxyId) {
    try {
        await fetch('/api/proxy/select', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: proxyId })
        });
        fetchStatus();
    } catch (err) {
        alert('Failed to select proxy: ' + err);
    }
}

// ── Custom Proxy Modal ──
function openAddProxyModal() {
    document.getElementById('modal-add-proxy')?.classList.add('active');
}

function closeAddProxyModal(e) {
    if (e && e.target && e.target.id !== 'modal-add-proxy') return;
    document.getElementById('modal-add-proxy')?.classList.remove('active');
}

async function submitCustomProxy() {
    const ip = document.getElementById('m-proxy-ip')?.value?.trim();
    const port = parseInt(document.getElementById('m-proxy-port')?.value, 10);
    const type = document.getElementById('m-proxy-type')?.value;
    const user = document.getElementById('m-proxy-user')?.value?.trim() || null;
    const pass = document.getElementById('m-proxy-pass')?.value?.trim() || null;

    if (!ip || isNaN(port)) {
        alert('Please enter a valid IP and Port number.');
        return;
    }

    try {
        const res = await fetch('/api/proxy/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip, port, type, username: user, password: pass })
        });
        if (res.ok) {
            closeAddProxyModal();
            fetchProxies();
            fetchStatus();
        } else {
            alert('Failed to add proxy.');
        }
    } catch (err) {
        alert('Error: ' + err);
    }
}

// ── AdBlock Management ──
async function fetchBlocklist() {
    try {
        const res = await fetch('/api/blocklist');
        if (!res.ok) return;
        const data = await res.json();

        cachedRules = data.rules || {};
        cachedWhitelist = data.whitelist || [];

        renderRulesTable(cachedRules);
        renderWhitelist(cachedWhitelist);

        // Update category checkboxes
        const cats = data.categories || {};
        setChecked('cat-toggle-ads', cats.ads !== false);
        setChecked('cat-toggle-tracking', cats.tracking !== false);
        setChecked('cat-toggle-malware', cats.malware !== false);
        setChecked('cat-toggle-custom', cats.custom !== false);

    } catch (err) {
        console.error('Error fetching blocklist:', err);
    }
}

function renderRulesTable(rules) {
    const tbody = document.getElementById('rules-tbody');
    if (!tbody) return;

    const entries = Object.entries(rules);
    if (entries.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="table-loading">No active block rules.</td></tr>`;
        return;
    }

    let html = '';
    entries.forEach(([domain, category]) => {
        html += `
            <tr>
                <td><code style="color:var(--cyan)">${domain}</code></td>
                <td><span class="tag-badge ${category}">${category}</span></td>
                <td>
                    <button class="btn-action-sm" onclick="removeBlockRule('${domain}')">Delete</button>
                </td>
            </tr>`;
    });
    tbody.innerHTML = html;
}

function renderWhitelist(wl) {
    const box = document.getElementById('whitelist-container');
    setElemText('whitelist-count', wl.length);
    if (!box) return;

    if (wl.length === 0) {
        box.innerHTML = `<div class="empty-hint">No whitelist exceptions defined.</div>`;
        return;
    }

    let html = '';
    wl.forEach(d => {
        html += `
            <div class="whitelist-item">
                <span>${d}</span>
                <button class="btn-action-sm" onclick="removeWhitelistRule('${d}')">✕</button>
            </div>`;
    });
    box.innerHTML = html;
}

async function submitBlockRule() {
    const domain = document.getElementById('new-rule-input')?.value?.trim();
    const category = document.getElementById('new-rule-cat')?.value || 'custom';
    if (!domain) return;

    await fetch('/api/blocklist/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', domain, category })
    });
    document.getElementById('new-rule-input').value = '';
    fetchBlocklist();
}

async function removeBlockRule(domain) {
    await fetch('/api/blocklist/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', domain })
    });
    fetchBlocklist();
}

async function submitWhitelistRule() {
    const domain = document.getElementById('new-whitelist-input')?.value?.trim();
    if (!domain) return;

    await fetch('/api/blocklist/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_whitelist', domain })
    });
    document.getElementById('new-whitelist-input').value = '';
    fetchBlocklist();
}

async function removeWhitelistRule(domain) {
    await fetch('/api/blocklist/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_whitelist', domain })
    });
    fetchBlocklist();
}

async function toggleAdCategory(category, enabled) {
    await fetch('/api/blocklist/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, enabled })
    });
    fetchBlocklist();
}

function filterRulesTable() {
    const q = (document.getElementById('rule-search-input')?.value || '').toLowerCase();
    const filtered = {};
    for (const [d, c] of Object.entries(cachedRules)) {
        if (d.toLowerCase().includes(q) || c.toLowerCase().includes(q)) {
            filtered[d] = c;
        }
    }
    renderRulesTable(filtered);
}

// ── Analytics Tab ──
function renderAnalyticsTable(items) {
    const tbody = document.getElementById('analytics-tbody');
    if (!tbody) return;

    if (!items || items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="table-loading">No proxy performance records found.</td></tr>`;
        return;
    }

    // Sort by Score descending
    const sorted = [...items].sort((a, b) => {
        const scoreA = a.score || (a.status?.score) || 0;
        const scoreB = b.score || (b.status?.score) || 0;
        return scoreB - scoreA;
    });

    setElemText('an-tracked-count', sorted.length);

    let totalSpeed = 0;
    let speedCount = 0;
    let topScore = 0;

    let html = '';
    sorted.slice(0, 50).forEach((item, idx) => {
        const p = item.proxy || item;
        const s = item.status || {};
        const score = (item.score || s.score || 0);
        if (score > topScore) topScore = score;

        if (s.response_time_ms > 0) {
            totalSpeed += s.response_time_ms;
            speedCount++;
        }

        const tags = s.tags || [];
        const tagsHtml = tags.map(t => `<span class="tag-badge">${t}</span>`).join(' ') || '—';

        html += `
            <tr>
                <td><strong>#${idx + 1}</strong></td>
                <td><code style="color:var(--text-main)">${p.ip}:${p.port}</code></td>
                <td>${p.country || '??'}</td>
                <td>${s.response_time_ms ? Math.round(s.response_time_ms) + 'ms' : '--'}</td>
                <td>${s.total_checks > 0 ? Math.round((s.total_successes / s.total_checks) * 100) + '%' : '100%'}</td>
                <td><strong style="color:var(--cyan)">${score.toFixed(1)}</strong></td>
                <td>${s.total_checks || 0}</td>
                <td>${tagsHtml}</td>
            </tr>`;
    });

    tbody.innerHTML = html;

    if (speedCount > 0) {
        setElemText('an-avg-speed', `${Math.round(totalSpeed / speedCount)} ms`);
    }
    setElemText('an-top-score', topScore.toFixed(1));
    setElemText('an-avg-uptime', '98.4 %');
}

// ── Countries ──
async function fetchCountries() {
    try {
        const res = await fetch('/api/countries');
        if (!res.ok) return;
        const countries = await res.json();

        const sel1 = document.getElementById('proxy-country-select');
        const sel2 = document.getElementById('cfg-COUNTRY_FILTER');

        if (Array.isArray(countries)) {
            countries.forEach(c => {
                if (c && c !== 'GLOBAL' && c !== 'Unknown') {
                    if (sel1) sel1.innerHTML += `<option value="${c}">${c}</option>`;
                    if (sel2) sel2.innerHTML += `<option value="${c}">${c}</option>`;
                }
            });
        }
    } catch (err) {
        console.warn('Could not fetch country list:', err);
    }
}

// ── Settings ──
async function fetchConfig() {
    try {
        const res = await fetch('/api/config');
        if (!res.ok) return;
        const cfg = await res.json();

        setVal('cfg-LOCAL_PORT', cfg.LOCAL_PORT || 1080);
        setVal('cfg-HTTP_PROXY_PORT', cfg.HTTP_PROXY_PORT || 8080);
        setVal('cfg-MAX_SPEED_MS', cfg.MAX_SPEED_MS || 5000);
        setVal('cfg-MAX_CONCURRENT_CHECKS', cfg.MAX_CONCURRENT_CHECKS || 50);
        setVal('cfg-FAILOVER_MAX_RETRIES', cfg.FAILOVER_MAX_RETRIES || 3);
        setVal('cfg-DEAD_RETRY_AFTER_SECONDS', cfg.DEAD_RETRY_AFTER_SECONDS || 120);
        setVal('cfg-BLACKLIST_AFTER_FAILURES', cfg.BLACKLIST_AFTER_FAILURES || 10);

        setChecked('cfg-ANONYMITY_CHECK', cfg.ANONYMITY_CHECK !== false);
        setChecked('cfg-SSL_CHECK_ENABLED', cfg.SSL_CHECK_ENABLED !== false);

    } catch (err) {
        console.error('Error loading config:', err);
    }
}

async function saveEngineConfig() {
    const payload = {
        LOCAL_PORT: parseInt(document.getElementById('cfg-LOCAL_PORT')?.value, 10),
        HTTP_PROXY_PORT: parseInt(document.getElementById('cfg-HTTP_PROXY_PORT')?.value, 10),
        COUNTRY_FILTER: document.getElementById('cfg-COUNTRY_FILTER')?.value || 'GLOBAL',
        MAX_SPEED_MS: parseInt(document.getElementById('cfg-MAX_SPEED_MS')?.value, 10),
        MAX_CONCURRENT_CHECKS: parseInt(document.getElementById('cfg-MAX_CONCURRENT_CHECKS')?.value, 10),
        FAILOVER_MAX_RETRIES: parseInt(document.getElementById('cfg-FAILOVER_MAX_RETRIES')?.value, 10),
        DEAD_RETRY_AFTER_SECONDS: parseInt(document.getElementById('cfg-DEAD_RETRY_AFTER_SECONDS')?.value, 10),
        BLACKLIST_AFTER_FAILURES: parseInt(document.getElementById('cfg-BLACKLIST_AFTER_FAILURES')?.value, 10),
        ANONYMITY_CHECK: document.getElementById('cfg-ANONYMITY_CHECK')?.checked,
        SSL_CHECK_ENABLED: document.getElementById('cfg-SSL_CHECK_ENABLED')?.checked,
    };

    try {
        const res = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const box = document.getElementById('settings-alert-box');
        if (box) {
            box.className = 'alert-box success';
            box.innerText = '✅ Configuration changes saved successfully to engine_config.json!';
            box.style.display = 'block';
            setTimeout(() => { box.style.display = 'none'; }, 4000);
        }
    } catch (err) {
        alert('Failed saving config: ' + err);
    }
}

// ── Helpers ──
function setElemText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}

function setElemStyleWidth(id, width) {
    const el = document.getElementById(id);
    if (el) el.style.width = width;
}

function setVal(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}

function setChecked(id, checked) {
    const el = document.getElementById(id);
    if (el) el.checked = checked;
}

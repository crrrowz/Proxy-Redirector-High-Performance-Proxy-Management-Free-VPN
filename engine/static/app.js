/**
 * Proxy Redirector v3 — Engine Dashboard Client Logic
 */

// ── Localization (i18n & RTL) ──
let currentLang = localStorage.getItem('engine_lang') || 'en';

const i18n = {
    en: {
        brandSubtitle: 'v3.0 Engine',
        navOperations: 'Operations',
        navSystem: 'System',
        tabDashboard: 'Dashboard',
        tabProxies: 'Proxy Pool',
        tabAdblock: 'Ad Blocker',
        tabTraffic: 'Traffic Log',
        tabAnalytics: 'Analytics',
        tabDevices: 'LAN Devices',
        tabSettings: 'Settings',
        statAlive: 'Alive Proxies',
        statTotalPool: 'Total pool:',
        statBlocked: 'Ads Intercepted',
        statRules: 'Active rules:',
        statActiveLatency: 'Active Proxy Latency',
        statCountry: 'Country:',
        statReliability: 'Pool Reliability',
        statScoreIndex: 'Score index / 100',
        activeProxyTitle: 'Current Active Proxy',
        forceSwitchBtn: '🔄 Force Switch',
        gatewaysTitle: 'Network Gateways',
        listeningBadge: 'Listening',
        poolHealthTitle: 'Pool Health Distribution',
        legendAlive: 'Alive',
        legendRetry: 'Retryable',
        legendDead: 'Dead/Banned',
        legendUnchecked: 'Unchecked',
        langBtnText: '🌐 العربية',
        engineOnline: 'Engine Online',
        engineOffline: 'Engine Offline',
    },
    ar: {
        brandSubtitle: 'المحرك الإصدار 3.0',
        navOperations: 'العمليات والمراقبة',
        navSystem: 'إعدادات النظام',
        tabDashboard: 'لوحة التحكم',
        tabProxies: 'مجمع البروكسيات',
        tabAdblock: 'مانع الإعلانات',
        tabTraffic: 'سجل الترافيك',
        tabAnalytics: 'التحليلات والأداء',
        tabDevices: 'أجهزة الشبكة',
        tabSettings: 'الإعدادات',
        statAlive: 'البروكسيات الشغالة',
        statTotalPool: 'إجمالي المجمع:',
        statBlocked: 'إعلانات تم حظرها',
        statRules: 'القواعد النشطة:',
        statActiveLatency: 'سرعة البروكسي النشط',
        statCountry: 'الدولة:',
        statReliability: 'اعتمادية المجمع',
        statScoreIndex: 'مؤشر الكفاءة / 100',
        activeProxyTitle: 'البروكسي النشط حالياً',
        forceSwitchBtn: '🔄 تبديل فوري',
        gatewaysTitle: 'بوابات ومنافذ الشبكة',
        listeningBadge: 'متصل ويعمل',
        poolHealthTitle: 'توزيع صحة البروكسيات',
        legendAlive: 'يعمل',
        legendRetry: 'قيد الإعادة',
        legendDead: 'معطل / محظور',
        legendUnchecked: 'غير مفحوص',
        langBtnText: '🌐 English',
        engineOnline: 'المحرك نشط',
        engineOffline: 'المحرك متوقف',
    }
};

function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('engine_lang', lang);
    const t = i18n[lang] || i18n.en;
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', lang);

    const langBtn = document.getElementById('btn-lang-toggle');
    if (langBtn) langBtn.innerText = t.langBtnText;

    const stateText = document.getElementById('daemon-state-text');
    if (stateText) stateText.innerText = orbOnline() ? t.engineOnline : t.engineOffline;

    // Translate Navigation
    const navDashboard = document.querySelector('.nav-tab[data-tab="dashboard"] span:not(.tab-icon)');
    if (navDashboard) navDashboard.innerText = t.tabDashboard;
    const navProxies = document.querySelector('.nav-tab[data-tab="proxies"] span:not(.tab-icon)');
    if (navProxies) navProxies.innerText = t.tabProxies;
    const navAdblock = document.querySelector('.nav-tab[data-tab="adblock"] span:not(.tab-icon)');
    if (navAdblock) navAdblock.innerText = t.tabAdblock;
    const navTraffic = document.querySelector('.nav-tab[data-tab="traffic"] span:not(.tab-icon)');
    if (navTraffic) navTraffic.innerText = t.tabTraffic;
    const navAnalytics = document.querySelector('.nav-tab[data-tab="analytics"] span:not(.tab-icon)');
    if (navAnalytics) navAnalytics.innerText = t.tabAnalytics;
    const navDevices = document.querySelector('.nav-tab[data-tab="devices"] span:not(.tab-icon)');
    if (navDevices) navDevices.innerText = t.tabDevices;
    const navSettings = document.querySelector('.nav-tab[data-tab="settings"] span:not(.tab-icon)');
    if (navSettings) navSettings.innerText = t.tabSettings;
}

function orbOnline() {
    const orb = document.getElementById('engine-status-orb');
    return orb && !orb.classList.contains('offline');
}

function toggleLanguage() {
    const nextLang = currentLang === 'en' ? 'ar' : 'en';
    applyLanguage(nextLang);
    showToast(nextLang === 'ar' ? 'تم تحويل الواجهة إلى العربية بنجاح' : 'Switched interface to English', 'success');
}

// Pagination, Sorting & Filtering State
let proxyCurrentPage = 1;
const proxyPageSize = 25;
let proxySortCol = null;
let proxySortDir = 'asc';
let activeFilteredProxies = [];
let activeQuickFilter = 'all';
let selectedProxyIds = new Set();
let isTrafficPaused = false;
let isEngineRunning = true;

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    startPolling();
    setupVisibilityListener();
    setupKeyboardShortcuts();
});

function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // If typing in input or textarea, ignore
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
            if (e.key === 'Escape') {
                document.activeElement.blur();
                closeAllModals();
            }
            return;
        }

        // Tab shortcuts 1-6
        if (e.key >= '1' && e.key <= '6') {
            const tabs = ['dashboard', 'proxies', 'adblock', 'traffic', 'analytics', 'settings'];
            const target = tabs[parseInt(e.key, 10) - 1];
            if (target) {
                const btn = document.querySelector(`.nav-tab[data-tab="${target}"]`);
                switchTab(target, btn);
            }
        }

        // / to search
        if (e.key === '/') {
            e.preventDefault();
            if (activeTab === 'proxies') {
                document.getElementById('proxy-filter-input')?.focus();
            } else if (activeTab === 'adblock') {
                document.getElementById('rule-search-input')?.focus();
            } else if (activeTab === 'traffic') {
                document.getElementById('traffic-search-input')?.focus();
            }
        }
    });
}

function closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(el => el.classList.remove('active'));
}

function toggleMobileNav() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.toggle('open');
}

function initDashboard() {
    applyLanguage(currentLang);
    fetchStatus();
    fetchProxies();
    fetchBlocklist();
    fetchCountries();
    fetchConfig();
    fetchTraffic();
    fetchDevices();
}

function setupVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (pollTimer) clearInterval(pollTimer);
        } else {
            consecutivePollErrors = 0;
            pollIntervalMs = 2500;
            startPolling();
        }
    });
}

function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(async () => {
        if (document.hidden) return;
        try {
            if (activeTab === 'dashboard') {
                await fetchStatus();
            } else if (activeTab === 'proxies') {
                await fetchProxies();
            } else if (activeTab === 'adblock') {
                await fetchBlocklist();
            } else if (activeTab === 'analytics') {
                await fetchProxies();
            } else if (activeTab === 'devices') {
                await fetchDevices();
            } else if (activeTab === 'traffic') {
                await fetchTraffic();
            }
            if (consecutivePollErrors > 0) {
                consecutivePollErrors = 0;
                pollIntervalMs = 2500;
                startPolling();
            }
        } catch (err) {
            consecutivePollErrors++;
            if (consecutivePollErrors > 3 && pollIntervalMs < 10000) {
                pollIntervalMs = 10000;
                startPolling();
            }
        }
    }, pollIntervalMs);
}

// ── Lifecycle Control ──
async function toggleEngineState() {
    const btn = document.getElementById('btn-engine-toggle');
    const targetAction = isEngineRunning ? '/api/stop' : '/api/start';
    try {
        const res = await fetch(targetAction, { method: 'POST' });
        if (res.ok) {
            isEngineRunning = !isEngineRunning;
            if (btn) {
                btn.innerHTML = isEngineRunning ? '⏸️ Pause' : '▶️ Resume';
                btn.className = isEngineRunning ? 'btn sm' : 'btn sm success';
            }
            showToast(isEngineRunning ? '▶️ Engine resumed' : '⏸️ Engine paused', 'info');
            fetchStatus();
        }
    } catch (err) {
        showToast('Lifecycle command failed: ' + err, 'error');
    }
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
    if (tabId === 'devices') fetchDevices();
    if (tabId === 'traffic') fetchTraffic();
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
        setElemText('stat-rules-sub', `Active rules: ${adblock.rules_count || 0}`);
        setElemText('nav-blocked-count', adblock.total_blocked || 0);
        setElemText('nav-pool-count', pool.total || 0);

        // Pool Reliability Score card
        if (data.avg_score && Number(data.avg_score) > 0) {
            setElemText('stat-avg-score', Number(data.avg_score).toFixed(1));
        } else if (active && active.score && Number(active.score) > 0) {
            setElemText('stat-avg-score', Number(active.score).toFixed(1));
        } else {
            setElemText('stat-avg-score', '--');
        }

        // Network Gateways IP update
        if (data.gateways) {
            if (data.gateways.socks5) setElemText('gw-socks5', data.gateways.socks5);
            if (data.gateways.http) setElemText('gw-http', data.gateways.http);
            if (data.gateways.grpc) setElemText('gw-grpc', data.gateways.grpc);
            if (data.gateways.rest) setElemText('gw-rest', data.gateways.rest);
        }

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

    const rawSpeed = active.speed_ms || active.response_time_ms || active.ping;
    const speedMs = (rawSpeed && Number(rawSpeed) > 0) ? `${Math.round(Number(rawSpeed))} ms` : '-- ms';
    const country = active.country || 'Unknown';
    const city = active.city ? `, ${active.city}` : '';
    const score = (active.score !== undefined && active.score !== null && !isNaN(Number(active.score))) ? Number(active.score).toFixed(1) : '--';

    setElemText('stat-active-speed', speedMs);
    setElemText('stat-active-country', `Country: ${country}`);

    box.innerHTML = `
        <div class="active-endpoint-wrap">
            <span class="active-endpoint">${active.ip}:${active.port}</span>
            <button class="btn-copy-sm" onclick="copyToClipboard('${active.ip}:${active.port}', 'Active proxy copied!')" title="Copy Address">📋</button>
        </div>
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

    const deadPermanent = Math.max(0, (pool.dead || 0) - (pool.dead_retryable || 0)) + (pool.blacklisted || 0);

    const alivePct = ((pool.alive || 0) / total) * 100;
    const retryPct = ((pool.dead_retryable || 0) / total) * 100;
    const deadPct = (deadPermanent / total) * 100;
    const uncheckPct = ((pool.unchecked || 0) / total) * 100;

    setElemStyleWidth('bar-alive', `${alivePct}%`);
    setElemStyleWidth('bar-retry', `${retryPct}%`);
    setElemStyleWidth('bar-dead', `${deadPct}%`);
    setElemStyleWidth('bar-unchecked', `${uncheckPct}%`);

    setElemText('leg-alive', pool.alive || 0);
    setElemText('leg-retry', pool.dead_retryable || 0);
    setElemText('leg-dead', pool.dead || 0);
    setElemText('leg-unchecked', pool.unchecked || 0);

    setElemText('pool-counts-summary', `${pool.alive || 0} healthy / ${total} total proxies`);
}

async function forceSwitchProxy() {
    try {
        const res = await fetch('/api/proxy/select', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: 'auto', mode: 'auto' })
        });
        if (res.ok) {
            showToast('🔄 Successfully initiated automatic proxy failover rotation.', 'success');
            fetchStatus();
        } else {
            showToast('Failed to force switch proxy', 'error');
        }
    } catch (err) {
        showToast('Failed to force switch proxy: ' + err, 'error');
    }
}

// ── Proxy Pool Management ──
async function fetchProxies() {
    try {
        const res = await fetch('/api/proxies');
        if (!res.ok) throw new Error('Failed to load proxies');
        const items = await res.json();
        cachedProxies = items || [];
        filterProxiesTable();
        renderAnalyticsTable(cachedProxies);
    } catch (err) {
        console.error('Error fetching proxies:', err);
    }
}

function sortProxiesTable(column) {
    if (proxySortCol === column) {
        proxySortDir = proxySortDir === 'asc' ? 'desc' : 'asc';
    } else {
        proxySortCol = column;
        proxySortDir = 'asc';
    }

    // Update header UI
    document.querySelectorAll('#proxies-data-table th.sortable').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
    });
    const headerIndex = {
        'endpoint': 1, 'type': 2, 'country': 3, 'alive': 4, 'latency': 5, 'score': 6, 'fails': 8
    }[column];
    if (headerIndex !== undefined) {
        const targetTh = document.querySelectorAll('#proxies-data-table th.sortable')[headerIndex - 1];
        if (targetTh) targetTh.classList.add(proxySortDir === 'asc' ? 'sort-asc' : 'sort-desc');
    }

    filterProxiesTable();
}

function prevProxyPage() {
    if (proxyCurrentPage > 1) {
        proxyCurrentPage--;
        renderProxiesTable(activeFilteredProxies);
    }
}

function nextProxyPage() {
    const totalPages = Math.ceil(activeFilteredProxies.length / proxyPageSize) || 1;
    if (proxyCurrentPage < totalPages) {
        proxyCurrentPage++;
        renderProxiesTable(activeFilteredProxies);
    }
}

function setQuickFilter(type, btn) {
    activeQuickFilter = type;
    document.querySelectorAll('.filter-pill').forEach(el => el.classList.remove('active'));
    if (btn) btn.classList.add('active');
    filterProxiesTable();
}

function toggleSelectAllProxies(checked) {
    if (checked) {
        activeFilteredProxies.forEach(item => {
            const p = item.proxy || item;
            const selectId = p.id || `${p.ip}_${p.port}`;
            selectedProxyIds.add(selectId);
        });
    } else {
        selectedProxyIds.clear();
    }
    updateBatchBar();
    renderProxiesTable(activeFilteredProxies);
}

function toggleSelectProxy(proxyId, checked) {
    if (checked) {
        selectedProxyIds.add(proxyId);
    } else {
        selectedProxyIds.delete(proxyId);
    }
    updateBatchBar();
}

function updateBatchBar() {
    const bar = document.getElementById('batch-actions-bar');
    const countSpan = document.getElementById('batch-selected-count');
    const masterCb = document.getElementById('th-select-all');

    if (!bar) return;
    if (selectedProxyIds.size > 0) {
        bar.style.display = 'flex';
        if (countSpan) countSpan.innerText = `${selectedProxyIds.size} selected`;
    } else {
        bar.style.display = 'none';
    }

    if (masterCb) {
        masterCb.checked = activeFilteredProxies.length > 0 && selectedProxyIds.size >= activeFilteredProxies.length;
    }
}

function deselectAllProxies() {
    selectedProxyIds.clear();
    updateBatchBar();
    renderProxiesTable(activeFilteredProxies);
}

async function batchRecheckSelected() {
    if (selectedProxyIds.size === 0) return;
    const ids = Array.from(selectedProxyIds);
    showToast(`⚡ Initiating re-check for ${ids.length} proxies...`, 'info');
    try {
        const res = await fetch('/api/proxy/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'recheck', ids })
        });
        if (res.ok) {
            showToast(`Queued ${ids.length} proxies for verification.`, 'success');
            setTimeout(() => { fetchProxies(); fetchStatus(); }, 2500);
        }
    } catch (err) {
        showToast('Batch recheck error: ' + err, 'error');
    }
}

async function batchDeleteSelected() {
    if (selectedProxyIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedProxyIds.size} selected proxies?`)) return;

    const ids = Array.from(selectedProxyIds);
    try {
        const res = await fetch('/api/proxy/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', ids })
        });
        if (res.ok) {
            const data = await res.json();
            showToast(`Deleted ${data.deleted_count || 0} proxies.`, 'success');
            selectedProxyIds.clear();
            updateBatchBar();
            fetchProxies();
            fetchStatus();
        }
    } catch (err) {
        showToast('Batch delete error: ' + err, 'error');
    }
}

function copyToClipboard(text, label = 'Copied to clipboard!') {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(`📋 ${label}`, 'success', 2000);
        });
    } else {
        const input = document.createElement('textarea');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showToast(`📋 ${label}`, 'success', 2000);
    }
}

function renderProxiesTable(items) {
    const tbody = document.getElementById('proxies-tbody');
    if (!tbody) return;

    if (!items || items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="table-loading">No proxies found matching criteria.</td></tr>`;
        setElemText('proxy-page-info', 'Showing 0-0 of 0 proxies');
        setElemText('proxy-current-page', 'Page 1 / 1');
        const prevBtn = document.getElementById('proxy-prev-btn');
        const nextBtn = document.getElementById('proxy-next-btn');
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        return;
    }

    // Apply Sorting
    let sorted = [...items];
    if (proxySortCol) {
        sorted.sort((a, b) => {
            const pA = a.proxy || a;
            const pB = b.proxy || b;
            const sA = a.status || {};
            const sB = b.status || {};

            let valA, valB;
            switch (proxySortCol) {
                case 'endpoint':
                    valA = `${pA.ip}:${pA.port}`;
                    valB = `${pB.ip}:${pB.port}`;
                    break;
                case 'type':
                    valA = (pA.type || '').toLowerCase();
                    valB = (pB.type || '').toLowerCase();
                    break;
                case 'country':
                    valA = (pA.country || '').toLowerCase();
                    valB = (pB.country || '').toLowerCase();
                    break;
                case 'alive':
                    valA = (sA.alive || pA.alive) ? 1 : 0;
                    valB = (sB.alive || pB.alive) ? 1 : 0;
                    break;
                case 'latency':
                    valA = sA.response_time_ms || pA.ping || 99999;
                    valB = sB.response_time_ms || pB.ping || 99999;
                    break;
                case 'score':
                    valA = a.score || sA.score || 0;
                    valB = b.score || sB.score || 0;
                    break;
                case 'fails':
                    valA = sA.consecutive_failures || 0;
                    valB = sB.consecutive_failures || 0;
                    break;
                default:
                    valA = 0;
                    valB = 0;
            }

            if (valA < valB) return proxySortDir === 'asc' ? -1 : 1;
            if (valA > valB) return proxySortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // Apply Pagination Window
    const totalItems = sorted.length;
    const totalPages = Math.ceil(totalItems / proxyPageSize) || 1;
    if (proxyCurrentPage > totalPages) proxyCurrentPage = totalPages;
    if (proxyCurrentPage < 1) proxyCurrentPage = 1;

    const startIndex = (proxyCurrentPage - 1) * proxyPageSize;
    const endIndex = Math.min(startIndex + proxyPageSize, totalItems);
    const pagedItems = sorted.slice(startIndex, endIndex);

    setElemText('proxy-page-info', `Showing ${startIndex + 1}-${endIndex} of ${totalItems} proxies`);
    setElemText('proxy-current-page', `Page ${proxyCurrentPage} / ${totalPages}`);
    const prevBtn = document.getElementById('proxy-prev-btn');
    const nextBtn = document.getElementById('proxy-next-btn');
    if (prevBtn) prevBtn.disabled = (proxyCurrentPage <= 1);
    if (nextBtn) nextBtn.disabled = (proxyCurrentPage >= totalPages);

    let html = '';
    pagedItems.forEach((item, idx) => {
        const p = item.proxy || item;
        const s = item.status || {};
        const isAlive = s.alive || p.alive;
        const speed = s.response_time_ms ? `${Math.round(s.response_time_ms)}ms` : (p.ping ? `${Math.round(p.ping)}ms` : '--');
        const score = (item.score || s.score || 0).toFixed(1);
        const endpointSafe = `${escapeHtml(p.ip)}:${escapeHtml(p.port)}`;
        const selectId = escapeHtml(p.id || `${p.ip}_${p.port}`);
        const isChecked = selectedProxyIds.has(selectId);

        html += `
            <tr class="${isChecked ? 'row-selected' : ''}">
                <td style="text-align: center;">
                    <input type="checkbox" class="row-cb" onchange="toggleSelectProxy('${selectId}', this.checked)" ${isChecked ? 'checked' : ''}>
                </td>
                <td>${startIndex + idx + 1}</td>
                <td>
                    <div class="endpoint-cell">
                        <strong style="font-family:var(--font-mono)">${endpointSafe}</strong>
                        <button class="btn-copy-sm" onclick="copyToClipboard('${endpointSafe}', 'Endpoint copied!')" title="Copy Address">📋</button>
                    </div>
                </td>
                <td><span class="tag-badge">${escapeHtml((p.type || 'SOCKS5').toUpperCase())}</span></td>
                <td>${escapeHtml(p.country || '??')}</td>
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
                    <div class="row-actions">
                        <button class="btn-action-sm" onclick="selectSpecificProxy('${selectId}')" title="Route traffic through this proxy">Select</button>
                        <button class="btn-action-sm action-recheck" onclick="recheckProxy('${selectId}')" title="Ping & verify">⚡</button>
                        <button class="btn-action-sm action-delete" onclick="deleteProxy('${selectId}')" title="Remove proxy">🗑️</button>
                    </div>
                </td>
            </tr>`;
    });
    tbody.innerHTML = html;
    updateBatchBar();
}

function filterProxiesTable() {
    const q = (document.getElementById('proxy-filter-input')?.value || '').toLowerCase();
    const c = (document.getElementById('proxy-country-select')?.value || '').toUpperCase();

    activeFilteredProxies = cachedProxies.filter(item => {
        const p = item.proxy || item;
        const s = item.status || {};
        const endpoint = `${p.ip}:${p.port}`.toLowerCase();
        const country = (p.country || '').toUpperCase();
        const type = (p.type || '').toLowerCase();
        const isAlive = s.alive || p.alive;
        const isSSL = s.ssl_verified;

        const matchesQuery = !q || endpoint.includes(q) || country.toLowerCase().includes(q) || type.includes(q);
        const matchesCountry = !c || country === c;

        let matchesQuickFilter = true;
        if (activeQuickFilter === 'alive') matchesQuickFilter = isAlive;
        else if (activeQuickFilter === 'ssl') matchesQuickFilter = isSSL;
        else if (activeQuickFilter === 'socks5') matchesQuickFilter = type.includes('socks');
        else if (activeQuickFilter === 'http') matchesQuickFilter = type.includes('http');

        return matchesQuery && matchesCountry && matchesQuickFilter;
    });

    renderProxiesTable(activeFilteredProxies);
}

function exportProxiesJson() {
    if (!cachedProxies || cachedProxies.length === 0) {
        showToast('No proxies available to export.', 'info');
        return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cachedProxies, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `proxy_pool_export_${new Date().toISOString().slice(0,10)}.json`);
    dlAnchorElem.click();
    showToast('📥 Proxy pool exported successfully.', 'success');
}

async function selectSpecificProxy(proxyId) {
    try {
        const res = await fetch('/api/proxy/select', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: proxyId })
        });
        if (res.ok) {
            showToast(`Proxy ${proxyId} selected as active route.`, 'success');
            fetchStatus();
        } else {
            showToast('Failed to select proxy.', 'error');
        }
    } catch (err) {
        showToast('Failed to select proxy: ' + err, 'error');
    }
}

async function recheckProxy(proxyId) {
    showToast(`⚡ Re-checking proxy ${proxyId}...`, 'info', 2000);
    try {
        const res = await fetch('/api/proxy/recheck', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: proxyId })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.alive) {
                showToast(`✓ Proxy alive: ${Math.round(data.response_time_ms || 0)}ms`, 'success');
            } else {
                showToast(`✗ Proxy failed check: ${data.error || 'unreachable'}`, 'error');
            }
            fetchProxies();
            fetchStatus();
        } else {
            showToast('Re-check request failed.', 'error');
        }
    } catch (err) {
        showToast('Error checking proxy: ' + err, 'error');
    }
}

async function deleteProxy(proxyId) {
    try {
        const res = await fetch('/api/proxy/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: proxyId })
        });
        if (res.ok) {
            showToast(`Proxy ${proxyId} deleted.`, 'success');
            fetchProxies();
            fetchStatus();
        } else {
            showToast('Failed to delete proxy.', 'error');
        }
    } catch (err) {
        showToast('Error deleting proxy: ' + err, 'error');
    }
}

async function purgeDeadProxies() {
    try {
        const res = await fetch('/api/proxy/purge-dead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        if (res.ok) {
            const data = await res.json();
            showToast(`🧹 Purged ${data.purged_count || 0} dead/blacklisted proxies.`, 'success');
            fetchProxies();
            fetchStatus();
        } else {
            showToast('Failed to purge dead proxies.', 'error');
        }
    } catch (err) {
        showToast('Error purging dead proxies: ' + err, 'error');
    }
}

// ── Bulk Import Modal ──
function openBulkImportModal() {
    document.getElementById('modal-bulk-import')?.classList.add('active');
}

function closeBulkImportModal(e) {
    if (e && e.target && e.target.id !== 'modal-bulk-import') return;
    document.getElementById('modal-bulk-import')?.classList.remove('active');
}

async function submitBulkProxies() {
    const rawText = document.getElementById('m-bulk-text')?.value;
    const pType = document.getElementById('m-bulk-type')?.value || 'socks5';

    if (!rawText || !rawText.trim()) {
        showToast('Please paste proxy lines first.', 'error');
        return;
    }

    try {
        const res = await fetch('/api/proxies/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ raw_text: rawText, type: pType })
        });
        if (res.ok) {
            const data = await res.json();
            closeBulkImportModal();
            const textarea = document.getElementById('m-bulk-text');
            if (textarea) textarea.value = '';
            showToast(`📥 Successfully imported ${data.added_count || 0} proxies!`, 'success');
            fetchProxies();
            fetchStatus();
        } else {
            showToast('Bulk import failed.', 'error');
        }
    } catch (err) {
        showToast('Bulk import error: ' + err, 'error');
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
        showToast('Please enter a valid IP and Port number.', 'error');
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
            showToast(`Proxy ${ip}:${port} added and queued for verification.`, 'success');
            fetchProxies();
            fetchStatus();
        } else {
            showToast('Failed to add proxy.', 'error');
        }
    } catch (err) {
        showToast('Error: ' + err, 'error');
    }
}

// ── AdBlock Management ──
function openBulkAdBlockModal() {
    document.getElementById('modal-bulk-adblock')?.classList.add('active');
}

function closeBulkAdBlockModal(e) {
    if (e && e.target && e.target.id !== 'modal-bulk-adblock') return;
    document.getElementById('modal-bulk-adblock')?.classList.remove('active');
}

async function submitBulkAdBlock() {
    const rawText = document.getElementById('m-adblock-text')?.value;
    const target = document.getElementById('m-adblock-target')?.value || 'blocklist';
    const cat = document.getElementById('m-adblock-cat')?.value || 'custom';

    if (!rawText || !rawText.trim()) {
        showToast('Please paste domain rules first.', 'error');
        return;
    }

    try {
        const res = await fetch('/api/blocklist/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ raw_text: rawText, target, category: cat })
        });
        if (res.ok) {
            const data = await res.json();
            closeBulkAdBlockModal();
            const textarea = document.getElementById('m-adblock-text');
            if (textarea) textarea.value = '';
            showToast(`📥 Successfully imported ${data.added_count || 0} ${target} entries!`, 'success');
            fetchBlocklist();
            fetchStatus();
        } else {
            showToast('Bulk import failed.', 'error');
        }
    } catch (err) {
        showToast('Bulk import error: ' + err, 'error');
    }
}

function exportAdBlockRules() {
    const exportData = {
        rules: cachedRules,
        whitelist: cachedWhitelist,
        exported_at: new Date().toISOString()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `adblock_rules_export_${new Date().toISOString().slice(0,10)}.json`);
    dlAnchorElem.click();
    showToast('📤 AdBlock rules exported.', 'success');
}
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
        if (typeof data.enabled !== 'undefined') {
            setChecked('adblock-master-toggle', data.enabled !== false);
        }
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
        const safeDomain = escapeHtml(domain);
        const safeCategory = escapeHtml(category);
        html += `
            <tr>
                <td><code style="color:var(--cyan)">${safeDomain}</code></td>
                <td><span class="tag-badge ${safeCategory}">${safeCategory}</span></td>
                <td>
                    <button class="btn-action-sm" onclick="removeBlockRule('${safeDomain}')">Delete</button>
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
        const safeDomain = escapeHtml(d);
        html += `
            <div class="whitelist-item">
                <span>${safeDomain}</span>
                <button class="btn-action-sm" onclick="removeWhitelistRule('${safeDomain}')">✕</button>
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
    try {
        await fetch('/api/blocklist/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category, enabled })
        });
        fetchBlocklist();
    } catch (err) {
        console.error('Error toggling category:', err);
    }
}

async function toggleAdblockMaster(enabled) {
    try {
        await fetch('/api/blocklist/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: 'all', enabled })
        });
        fetchBlocklist();
    } catch (err) {
        console.error('Error toggling master adblock:', err);
    }
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
    let totalUptimePct = 0;
    let uptimeCount = 0;

    const countryCounts = {};
    const latencyBuckets = { '<500ms': 0, '500-1500ms': 0, '1500-3000ms': 0, '>3000ms': 0 };

    let html = '';
    sorted.slice(0, 50).forEach((item, idx) => {
        const p = item.proxy || item;
        const s = item.status || {};
        const score = (item.score || s.score || 0);
        if (score > topScore) topScore = score;

        const c = p.country || 'Unknown';
        countryCounts[c] = (countryCounts[c] || 0) + 1;

        if (s.response_time_ms > 0) {
            totalSpeed += s.response_time_ms;
            speedCount++;

            if (s.response_time_ms < 500) latencyBuckets['<500ms']++;
            else if (s.response_time_ms <= 1500) latencyBuckets['500-1500ms']++;
            else if (s.response_time_ms <= 3000) latencyBuckets['1500-3000ms']++;
            else latencyBuckets['>3000ms']++;
        }

        const checks = s.total_checks || 0;
        const successes = s.total_successes || 0;
        const uptimeVal = checks > 0 ? (successes / checks) * 100 : 100;
        totalUptimePct += uptimeVal;
        uptimeCount++;

        const tags = s.tags || [];
        const tagsHtml = tags.map(t => `<span class="tag-badge">${escapeHtml(t)}</span>`).join(' ') || '—';

        html += `
            <tr>
                <td><strong>#${idx + 1}</strong></td>
                <td><code style="color:var(--text-main)">${escapeHtml(p.ip)}:${escapeHtml(p.port)}</code></td>
                <td>${escapeHtml(p.country || '??')}</td>
                <td>${s.response_time_ms ? Math.round(s.response_time_ms) + 'ms' : '--'}</td>
                <td>${Math.round(uptimeVal)}%</td>
                <td><strong style="color:var(--cyan)">${score.toFixed(1)}</strong></td>
                <td>${checks}</td>
                <td>${tagsHtml}</td>
            </tr>`;
    });

    tbody.innerHTML = html;

    if (speedCount > 0) {
        setElemText('an-avg-speed', `${Math.round(totalSpeed / speedCount)} ms`);
    }
    setElemText('an-top-score', topScore.toFixed(1));
    const avgUptime = uptimeCount > 0 ? (totalUptimePct / uptimeCount).toFixed(1) : '100.0';
    setElemText('an-avg-uptime', `${avgUptime} %`);

    renderAnalyticsCharts(countryCounts, latencyBuckets);
}

function renderAnalyticsCharts(countries, latencies) {
    const countryBox = document.getElementById('chart-country-dist');
    const latencyBox = document.getElementById('chart-latency-hist');

    if (countryBox) {
        const sortedCountries = Object.entries(countries).sort((a, b) => b[1] - a[1]).slice(0, 6);
        const total = Object.values(countries).reduce((a, b) => a + b, 0) || 1;

        if (sortedCountries.length === 0) {
            countryBox.innerHTML = `<div class="empty-hint">No country distribution data.</div>`;
        } else {
            let html = '<div class="chart-bar-list">';
            sortedCountries.forEach(([name, count]) => {
                const pct = ((count / total) * 100).toFixed(1);
                html += `
                    <div class="chart-bar-item">
                        <div class="chart-bar-label"><span>${escapeHtml(name)}</span> <strong>${count} (${pct}%)</strong></div>
                        <div class="chart-bar-track">
                            <div class="chart-bar-fill cyan" style="width: ${pct}%"></div>
                        </div>
                    </div>`;
            });
            html += '</div>';
            countryBox.innerHTML = html;
        }
    }

    if (latencyBox) {
        const total = Object.values(latencies).reduce((a, b) => a + b, 0) || 1;
        let html = '<div class="chart-bar-list">';
        const colors = { '<500ms': 'green', '500-1500ms': 'cyan', '1500-3000ms': 'orange', '>3000ms': 'red' };
        Object.entries(latencies).forEach(([range, count]) => {
            const pct = ((count / total) * 100).toFixed(1);
            html += `
                <div class="chart-bar-item">
                    <div class="chart-bar-label"><span>${range}</span> <strong>${count} (${pct}%)</strong></div>
                    <div class="chart-bar-track">
                        <div class="chart-bar-fill ${colors[range] || 'cyan'}" style="width: ${pct}%"></div>
                    </div>
                </div>`;
        });
        html += '</div>';
        latencyBox.innerHTML = html;
    }
}

// ── Traffic Stream Controls ──
function toggleTrafficPause() {
    isTrafficPaused = !isTrafficPaused;
    const btn = document.getElementById('btn-traffic-pause');
    if (btn) {
        btn.innerHTML = isTrafficPaused ? '▶️ Resume Stream' : '⏸️ Pause Stream';
        btn.className = isTrafficPaused ? 'btn sm success' : 'btn sm';
    }
    showToast(isTrafficPaused ? '⏸️ Traffic stream paused' : '▶️ Traffic stream resumed', 'info');
}

function exportTrafficLog() {
    if (!trafficBuffer || trafficBuffer.length === 0) {
        showToast('No traffic records to export.', 'info');
        return;
    }
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(trafficBuffer, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `traffic_stream_export_${new Date().toISOString().slice(0,10)}.json`);
    dlAnchorElem.click();
    showToast('📥 Traffic log exported.', 'success');
}

// ── Config Backup & Reset ──
function exportConfigJson() {
    fetch('/api/config')
        .then(res => res.json())
        .then(cfg => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cfg, null, 2));
            const dlAnchorElem = document.createElement('a');
            dlAnchorElem.setAttribute("href", dataStr);
            dlAnchorElem.setAttribute("download", `engine_config_backup_${new Date().toISOString().slice(0,10)}.json`);
            dlAnchorElem.click();
            showToast('📤 Engine config backup exported.', 'success');
        })
        .catch(err => showToast('Export config error: ' + err, 'error'));
}

function triggerImportConfig() {
    document.getElementById('config-file-input')?.click();
}

function importConfigFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const cfg = JSON.parse(event.target.result);
            const res = await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cfg)
            });
            if (res.ok) {
                showToast('📥 Configuration imported successfully!', 'success');
                fetchConfig();
            } else {
                showToast('Failed to apply imported configuration.', 'error');
            }
        } catch (err) {
            showToast('Invalid JSON config file: ' + err, 'error');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

async function resetConfigDefaults() {
    if (!confirm('Are you sure you want to reset all engine configuration parameters to defaults?')) return;

    try {
        const res = await fetch('/api/config/reset', { method: 'POST' });
        if (res.ok) {
            showToast('🔄 Configuration reset to defaults.', 'success');
            fetchConfig();
        } else {
            showToast('Failed to reset config.', 'error');
        }
    } catch (err) {
        showToast('Reset config error: ' + err, 'error');
    }
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
        setVal('cfg-CHECK_URL', cfg.CHECK_URL || 'http://httpbin.org/ip');
        setVal('cfg-HTTPS_CHECK_URL', cfg.HTTPS_CHECK_URL || 'https://httpbin.org/ip');

        // Auto-rotation & scoring
        setChecked('cfg-ROTATION_ENABLED', cfg.ROTATION_ENABLED === true);
        setChecked('cfg-ROTATION_SSL_ONLY', cfg.ROTATION_SSL_ONLY === true);
        setVal('cfg-ROTATION_INTERVAL_SEC', cfg.ROTATION_INTERVAL_SEC || 60);
        setVal('cfg-ROTATION_POOL_SIZE', cfg.ROTATION_POOL_SIZE || 10);
        setVal('cfg-SCORE_ALIVE', cfg.SCORE_ALIVE || 100);
        setVal('cfg-SCORE_SPEED_MAX', cfg.SCORE_SPEED_MAX || 200);
        setVal('cfg-SCORE_SUCCESS_RATE_MAX', cfg.SCORE_SUCCESS_RATE_MAX || 50);
        setVal('cfg-SCORE_SSL_BONUS', cfg.SCORE_SSL_BONUS || 20);

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
        CHECK_URL: document.getElementById('cfg-CHECK_URL')?.value || 'http://httpbin.org/ip',
        HTTPS_CHECK_URL: document.getElementById('cfg-HTTPS_CHECK_URL')?.value || 'https://httpbin.org/ip',
        ROTATION_ENABLED: document.getElementById('cfg-ROTATION_ENABLED')?.checked,
        ROTATION_SSL_ONLY: document.getElementById('cfg-ROTATION_SSL_ONLY')?.checked,
        ROTATION_INTERVAL_SEC: parseInt(document.getElementById('cfg-ROTATION_INTERVAL_SEC')?.value, 10),
        ROTATION_POOL_SIZE: parseInt(document.getElementById('cfg-ROTATION_POOL_SIZE')?.value, 10),
        SCORE_ALIVE: parseFloat(document.getElementById('cfg-SCORE_ALIVE')?.value) || 100,
        SCORE_SPEED_MAX: parseFloat(document.getElementById('cfg-SCORE_SPEED_MAX')?.value) || 200,
        SCORE_SUCCESS_RATE_MAX: parseFloat(document.getElementById('cfg-SCORE_SUCCESS_RATE_MAX')?.value) || 50,
        SCORE_SSL_BONUS: parseFloat(document.getElementById('cfg-SCORE_SSL_BONUS')?.value) || 20,
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
        showToast('✅ Configuration changes saved successfully!', 'success');
    } catch (err) {
        showToast('Failed saving config: ' + err, 'error');
    }
}

// ── Traffic Stream ──
async function fetchTraffic() {
    if (isTrafficPaused) return;
    try {
        const res = await fetch('/api/traffic');
        if (!res.ok) return;
        const items = await res.json();
        if (Array.isArray(items) && items.length > 0) {
            trafficBuffer = items;
            renderTrafficStream();
        }
    } catch (err) {
        console.warn('Could not fetch traffic stream:', err);
    }
}

// ── Traffic Stream ──
function renderTrafficStream() {
    const tbody = document.getElementById('traffic-tbody');
    if (!tbody) return;

    if (!trafficBuffer || trafficBuffer.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-loading">Awaiting incoming network traffic...</td></tr>`;
        return;
    }

    const statusFilter = document.getElementById('traffic-status-filter')?.value || 'all';
    const searchQuery = (document.getElementById('traffic-search-input')?.value || '').toLowerCase();

    const filtered = trafficBuffer.filter(entry => {
        const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
        const matchesSearch = !searchQuery || 
            (entry.destination && entry.destination.toLowerCase().includes(searchQuery)) ||
            (entry.client && entry.client.toLowerCase().includes(searchQuery)) ||
            (entry.protocol && entry.protocol.toLowerCase().includes(searchQuery));
        return matchesStatus && matchesSearch;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-loading">No traffic records match the current filter.</td></tr>`;
        return;
    }

    let html = '';
    filtered.slice(0, 100).forEach(entry => {
        let badgeClass = 'tag-badge';
        let statusText = '✓ Forwarded';
        if (entry.status === 'blocked') {
            badgeClass = 'tag-badge danger';
            statusText = '🚫 Blocked';
        } else if (entry.status === 'failed') {
            badgeClass = 'tag-badge danger';
            statusText = '✗ Failed';
        } else {
            badgeClass = 'tag-badge success';
        }

        html += `
            <tr>
                <td><code style="color:var(--text-dim)">${escapeHtml(entry.timestamp || new Date().toLocaleTimeString())}</code></td>
                <td><span class="${badgeClass}">${statusText}</span></td>
                <td><code style="color:var(--text-main)">${escapeHtml(entry.client || '127.0.0.1')}</code></td>
                <td><span class="tag-badge cyan">${escapeHtml((entry.protocol || 'HTTP').toUpperCase())}</span></td>
                <td><strong style="color:var(--cyan)">${escapeHtml(entry.destination || '-')}</strong></td>
                <td>${entry.latency ? `${Math.round(entry.latency)}ms` : '--'}</td>
            </tr>`;
    });

    tbody.innerHTML = html;
}

function filterTrafficStream() {
    renderTrafficStream();
}

function clearTrafficLog() {
    trafficBuffer = [];
    renderTrafficStream();
}

function pushTrafficEntry(entry) {
    if (!entry) return;
    trafficBuffer.unshift(entry);
    if (trafficBuffer.length > 500) {
        trafficBuffer.length = 500;
    }
}

// ── LAN Connected Devices ──
let cachedDevices = [];

async function fetchDevices() {
    try {
        const res = await fetch('/api/devices');
        if (!res.ok) throw new Error('Devices fetch failed');
        const devices = await res.json();
        cachedDevices = devices || [];
        renderDevices(cachedDevices);
        setElemText('nav-devices-count', cachedDevices.length);
    } catch (err) {
        console.warn('Could not fetch devices:', err);
    }
}

function renderDevices(devices) {
    const tbody = document.getElementById('devices-tbody');
    if (!tbody) return;

    if (!devices || devices.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="table-loading">No connected LAN devices detected.</td></tr>`;
        return;
    }

    let html = '';
    devices.forEach((dev) => {
        const isGateway = dev.ip.endsWith('.1') || dev.ip === '127.0.0.1';
        const icon = isGateway ? '🌐' : '📱';
        const label = isGateway ? 'Gateway / Host System' : 'Connected LAN Client';
        const latencyText = dev.avg_latency ? `${Math.round(dev.avg_latency)}ms` : '--';

        html += `
            <tr>
                <td><code style="color:var(--cyan); font-weight:600">${escapeHtml(dev.ip)}</code></td>
                <td><span>${icon} ${label}</span></td>
                <td><span class="tag-badge cyan">${escapeHtml((dev.protocol || 'SOCKS5').toUpperCase())}</span></td>
                <td><strong>${dev.request_count || 1}</strong></td>
                <td>${latencyText}</td>
                <td><span class="tag-badge success">● Active</span></td>
                <td><span style="color:var(--text-dim)">${escapeHtml(dev.last_seen || 'Just now')}</span></td>
            </tr>`;
    });

    tbody.innerHTML = html;
}

// ── Helpers ──
function escapeHtml(str) {
    if (typeof str !== 'string') return String(str || '');
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

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

// ── Toast Notifications ──
function showToast(message, type = 'info', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px) scale(0.95)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

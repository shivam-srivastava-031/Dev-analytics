// ═══════════════════════════════════════════════════════════════════
// Dashboard — Orchestrator, filters, cookie persistence
// ═══════════════════════════════════════════════════════════════════

import tracker from './tracker.js';
import { API_BASE } from './config.js';
import {
  renderTimelineChart,
  renderFeaturesChart,
  renderGenderChart,
  renderAgeChart,
  getDrilldownState,
  resetDrilldown,
} from './charts.js';

let refreshInterval = null;
let lastAnalyticsData = null;

// ── Cookie helpers ──────────────────────────────────────────────────
function setCookie(name, value, days = 30) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : '';
}

function clearCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

// ── Save / Restore filters from cookies ─────────────────────────────
function saveFiltersToCookies() {
  const filters = {
    from: document.getElementById('filter-from').value,
    to: document.getElementById('filter-to').value,
    age: document.getElementById('filter-age').value,
    gender: document.getElementById('filter-gender').value,
  };
  setCookie('dashboard_filters', JSON.stringify(filters));
}

function restoreFiltersFromCookies() {
  const raw = getCookie('dashboard_filters');
  if (!raw) return;
  try {
    const filters = JSON.parse(raw);
    if (filters.from) document.getElementById('filter-from').value = filters.from;
    if (filters.to) document.getElementById('filter-to').value = filters.to;
    if (filters.age) document.getElementById('filter-age').value = filters.age;
    if (filters.gender) document.getElementById('filter-gender').value = filters.gender;
  } catch (e) {
    // Invalid cookie, ignore
  }
}

// ── Build query string from filter inputs ───────────────────────────
function getFilterParams() {
  const params = new URLSearchParams();

  const from = document.getElementById('filter-from').value;
  const to = document.getElementById('filter-to').value;
  const age = document.getElementById('filter-age').value;
  const gender = document.getElementById('filter-gender').value;

  if (from) params.set('from', from + 'T00:00:00');
  if (to) params.set('to', to + 'T23:59:59');
  
  if (age === '<18') {
    params.set('age_max', '17');
  } else if (age === '18-40') {
    params.set('age_min', '18');
    params.set('age_max', '40');
  } else if (age === '>40') {
    params.set('age_min', '41');
  }
  
  if (gender) params.set('gender', gender);

  // If drilled down, add feature param
  const { isDrilledDown, drilldownFeature } = getDrilldownState();
  if (isDrilledDown && drilldownFeature) {
    params.set('feature', drilldownFeature);
  }

  return params.toString();
}

// ── Fetch analytics data ────────────────────────────────────────────
async function fetchAnalytics() {
  const token = localStorage.getItem('token');
  if (!token) return null;

  const queryString = getFilterParams();
  const url = `${API_BASE}/analytics${queryString ? '?' + queryString : ''}`;

  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (res.status === 401 || res.status === 403) {
      // Token expired
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      location.reload();
      return null;
    }

    const data = await res.json();
    lastAnalyticsData = data;
    return data;
  } catch (err) {
    console.error('Failed to fetch analytics:', err);
    return null;
  }
}

// ── Update KPI cards ────────────────────────────────────────────────
function updateKPIs(data) {
  document.getElementById('kpi-total').textContent = data.total_clicks.toLocaleString();
  document.getElementById('kpi-users').textContent = data.unique_users.toLocaleString();

  // Today's clicks
  const today = new Date().toISOString().split('T')[0];
  const todayData = data.clicks_over_time.find(d => d.date === today);
  document.getElementById('kpi-today').textContent = todayData ? todayData.count.toLocaleString() : '0';

  // Top feature
  if (data.clicks_by_feature.length > 0) {
    document.getElementById('kpi-top-feature').textContent = data.clicks_by_feature[0].feature_name;
  } else {
    document.getElementById('kpi-top-feature').textContent = '—';
  }
}

// ── Render all charts ───────────────────────────────────────────────
function renderAllCharts(data) {
  const { isDrilledDown, drilldownFeature } = getDrilldownState();
  
  // Timeline chart shows total over time OR drilldown feature over time
  if (isDrilledDown && data.feature_drilldown) {
    renderTimelineChart(data.feature_drilldown, drilldownFeature);
  } else {
    renderTimelineChart(data.clicks_over_time, null);
  }

  renderFeaturesChart(data.clicks_by_feature);
  renderGenderChart(data.clicks_by_gender);
  renderAgeChart(data.clicks_by_age_group);
}

// ── Full refresh ────────────────────────────────────────────────────
async function refreshDashboard() {
  const data = await fetchAnalytics();
  if (!data) return;
  updateKPIs(data);
  renderAllCharts(data);
}

// ── Initialize Dashboard ────────────────────────────────────────────
export function initDashboard(user) {
  // Set username in nav
  document.getElementById('nav-username').textContent = user.username;

  // Restore filters from cookies
  restoreFiltersFromCookies();

  // Track page view
  tracker.track('page_view');

  // Initial load
  refreshDashboard();

  // Auto-refresh every 10 seconds
  refreshInterval = setInterval(refreshDashboard, 10000);

  // ── Filter event listeners ──────────────────────────────────────
  document.getElementById('apply-filters-btn').addEventListener('click', () => {
    saveFiltersToCookies();

    // Track which filters changed
    const gender = document.getElementById('filter-gender').value;
    const from = document.getElementById('filter-from').value;
    const age = document.getElementById('filter-age').value;

    if (from) tracker.track('date_filter');
    if (gender) tracker.track('gender_filter');
    if (age) tracker.track('age_filter');

    // If none specific, track general filter use
    if (!from && !gender && !age) tracker.track('date_filter');

    refreshDashboard();
  });

  document.getElementById('clear-filters-btn').addEventListener('click', () => {
    document.getElementById('filter-from').value = '';
    document.getElementById('filter-to').value = '';
    document.getElementById('filter-age').value = '';
    document.getElementById('filter-gender').value = '';
    clearCookie('dashboard_filters');
    resetDrilldown();
    refreshDashboard();
  });

  // ── Filter tracking on change ───────────────────────────────────
  document.getElementById('filter-gender').addEventListener('change', () => {
    tracker.track('gender_filter');
  });

  document.getElementById('filter-from').addEventListener('change', () => {
    tracker.track('date_filter');
  });

  document.getElementById('filter-to').addEventListener('change', () => {
    tracker.track('date_filter');
  });

  document.getElementById('filter-age').addEventListener('change', () => {
    tracker.track('age_filter');
  });

  // ── Drilldown handler ───────────────────────────────────────────
  window.addEventListener('feature-drilldown', async (e) => {
    const { feature } = e.detail;
    await refreshDashboard();
  });

  document.getElementById('drilldown-back-btn').addEventListener('click', () => {
    resetDrilldown();
    refreshDashboard();
  });
}

/** Cleanup on logout */
export function stopDashboard() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

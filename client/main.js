// ═══════════════════════════════════════════════════════════════════
// Main — App entry point, view routing, auth state
// ═══════════════════════════════════════════════════════════════════

import { initAuth } from './auth.js';
import { initDashboard, stopDashboard } from './dashboard.js';
import { destroyAllCharts } from './charts.js';
import tracker from './tracker.js';

const authView = document.getElementById('auth-view');
const dashboardView = document.getElementById('dashboard-view');

// ── View management ─────────────────────────────────────────────────
function showAuth() {
  authView.classList.add('active');
  dashboardView.classList.remove('active');
  tracker.stop();
  stopDashboard();
  destroyAllCharts();
}

function showDashboard(user) {
  authView.classList.remove('active');
  dashboardView.classList.add('active');
  tracker.start();
  initDashboard(user);
}

// ── Logout ──────────────────────────────────────────────────────────
document.getElementById('logout-btn').addEventListener('click', () => {
  tracker.track('logout');
  // Small delay to let the track event flush
  setTimeout(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showAuth();
  }, 300);
});

// ── Init ────────────────────────────────────────────────────────────
function init() {
  // Set up auth forms
  initAuth((user) => {
    showDashboard(user);
  });

  // Check for existing session
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      showDashboard(user);
    } catch {
      showAuth();
    }
  } else {
    showAuth();
  }
}

init();

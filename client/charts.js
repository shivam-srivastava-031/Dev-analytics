// ═══════════════════════════════════════════════════════════════════
// Charts — Chart.js instances with self-referential tracking
// ═══════════════════════════════════════════════════════════════════

import tracker from './tracker.js';

// Color palette
const COLORS = {
  violet: 'rgba(124, 58, 237, 1)',
  violetFade: 'rgba(124, 58, 237, 0.15)',
  cyan: 'rgba(6, 182, 212, 1)',
  cyanFade: 'rgba(6, 182, 212, 0.15)',
  pink: 'rgba(236, 72, 153, 1)',
  amber: 'rgba(245, 158, 11, 1)',
  green: 'rgba(34, 197, 94, 1)',
  red: 'rgba(239, 68, 68, 1)',
  blue: 'rgba(59, 130, 246, 1)',
  orange: 'rgba(249, 115, 22, 1)',
};

const FEATURE_COLORS = [
  COLORS.violet, COLORS.cyan, COLORS.pink, COLORS.amber,
  COLORS.green, COLORS.red, COLORS.blue, COLORS.orange,
];

// Chart.js global defaults
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.06)';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.pointStyle = 'circle';
Chart.defaults.plugins.legend.labels.padding = 16;
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false;
Chart.defaults.animation.duration = 700;

let timelineChart = null;
let featuresChart = null;
let genderChart = null;
let ageChart = null;

// Track current drilldown state
let isDrilledDown = false;
let drilldownFeature = null;

/** Create/update the Clicks Over Time line chart */
export function renderTimelineChart(data, drilldownFeature = null) {
  const ctx = document.getElementById('chart-timeline');
  if (!ctx) return;

  // Find the container to update the title
  const container = ctx.closest('.chart-card');
  if (container) {
    const titleEl = container.querySelector('.chart-title');
    if (titleEl) {
      if (drilldownFeature) {
        titleEl.textContent = `"${drilldownFeature}" Clicks Daily`;
      } else {
        titleEl.textContent = 'Clicks Over Time';
      }
    }
  }

  const labels = data.map(d => {
    const date = new Date(d.date);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
  const values = data.map(d => d.count);

  if (timelineChart) {
    timelineChart.data.labels = labels;
    timelineChart.data.datasets[0].data = values;
    timelineChart.data.datasets[0].label = drilldownFeature || 'Clicks';
    timelineChart.update();
    return;
  }

  timelineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: drilldownFeature || 'Clicks',
        data: values,
        borderColor: COLORS.cyan,
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx: c, chartArea } = chart;
          if (!chartArea) return COLORS.cyanFade;
          const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(6, 182, 212, 0.3)');
          gradient.addColorStop(1, 'rgba(6, 182, 212, 0.0)');
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 7,
        pointBackgroundColor: COLORS.cyan,
        pointBorderColor: '#050816',
        pointBorderWidth: 2,
        borderWidth: 2.5,
      }],
    },
    options: {
      onClick: (e, elements) => {
        tracker.track('line_chart_click');
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(10, 14, 39, 0.9)',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 10,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxTicksLimit: 10 },
        },
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },
        },
      },
    },
  });
}

/** Create/update the Clicks by Feature bar chart */
export function renderFeaturesChart(data) {
  const ctx = document.getElementById('chart-features');
  const backBtn = document.getElementById('drilldown-back-btn');
  if (!ctx) return;

  if (isDrilledDown) {
    backBtn.classList.remove('hidden');
  } else {
    backBtn.classList.add('hidden');
  }

  const labels = data.map(d => d.feature_name);
  const values = data.map(d => d.count);
  const bgColors = data.map((_, i) => {
    const c = FEATURE_COLORS[i % FEATURE_COLORS.length];
    return c.replace(', 1)', ', 0.7)');
  });
  const borderColors = data.map((_, i) => FEATURE_COLORS[i % FEATURE_COLORS.length]);

  if (featuresChart) {
    featuresChart.data.labels = labels;
    featuresChart.data.datasets[0].data = values;
    featuresChart.data.datasets[0].backgroundColor = bgColors;
    featuresChart.data.datasets[0].borderColor = borderColors;
    featuresChart.update();
    return;
  }

  featuresChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Clicks',
        data: values,
        backgroundColor: bgColors,
        borderColor: borderColors,
        borderWidth: 1.5,
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      onClick: (e, elements) => {
        tracker.track('bar_chart_click');
        if (elements.length > 0) {
          const idx = elements[0].index;
          const feature = data[idx].feature_name;
          // Trigger drilldown
          isDrilledDown = true;
          drilldownFeature = feature;
          tracker.track('bar_chart_zoom');
          // Dispatch custom event for dashboard to handle
          window.dispatchEvent(new CustomEvent('feature-drilldown', { detail: { feature } }));
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(10, 14, 39, 0.9)',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          callbacks: {
            title: (items) => items[0].label,
            label: (item) => ` ${item.raw} clicks — click to see timeline`,
          },
        },
      },
      scales: {
        x: { 
          grid: { display: false },
          ticks: { font: { size: 11 } },
        },
        y: { 
          beginAtZero: true, 
          ticks: { precision: 0 } 
        },
      },
    },
  });
}

/** Create/update the Clicks by Gender doughnut chart */
export function renderGenderChart(data) {
  const ctx = document.getElementById('chart-gender');
  if (!ctx) return;

  const labels = data.map(d => d.gender);
  const values = data.map(d => d.count);
  const colors = [COLORS.violet, COLORS.pink, COLORS.cyan];
  const bgColors = colors.slice(0, data.length).map(c => c.replace(', 1)', ', 0.75)'));

  if (genderChart) {
    genderChart.data.labels = labels;
    genderChart.data.datasets[0].data = values;
    genderChart.update();
    return;
  }

  genderChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: bgColors,
        borderColor: colors.slice(0, data.length),
        borderWidth: 2,
        hoverOffset: 10,
        spacing: 3,
      }],
    },
    options: {
      cutout: '65%',
      onClick: () => tracker.track('doughnut_chart_click'),
      plugins: {
        legend: {
          position: 'bottom',
          labels: { padding: 20, font: { size: 12 } },
        },
        tooltip: {
          backgroundColor: 'rgba(10, 14, 39, 0.9)',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          callbacks: {
            label: (item) => ` ${item.label}: ${item.raw} clicks (${((item.raw / values.reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%)`,
          },
        },
      },
    },
  });
}

/** Create/update the Clicks by Age Group bar chart */
export function renderAgeChart(data) {
  const ctx = document.getElementById('chart-age');
  if (!ctx) return;

  const labels = data.map(d => d.age_group);
  const values = data.map(d => d.count);

  if (ageChart) {
    ageChart.data.labels = labels;
    ageChart.data.datasets[0].data = values;
    ageChart.update();
    return;
  }

  ageChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Clicks',
        data: values,
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx: c, chartArea } = chart;
          if (!chartArea) return COLORS.violetFade;
          const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          gradient.addColorStop(0, 'rgba(124, 58, 237, 0.8)');
          gradient.addColorStop(1, 'rgba(6, 182, 212, 0.8)');
          return gradient;
        },
        borderColor: COLORS.violet,
        borderWidth: 1.5,
        borderRadius: 8,
        borderSkipped: false,
      }],
    },
    options: {
      onClick: () => tracker.track('bar_chart_click'),
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(10, 14, 39, 0.9)',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          cornerRadius: 8,
        },
      },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, ticks: { precision: 0 } },
      },
    },
  });
}

/** Get current drilldown state */
export function getDrilldownState() {
  return { isDrilledDown, drilldownFeature };
}

/** Reset drilldown */
export function resetDrilldown() {
  isDrilledDown = false;
  drilldownFeature = null;
}

/** Destroy all charts (on logout) */
export function destroyAllCharts() {
  [timelineChart, featuresChart, genderChart, ageChart].forEach(c => {
    if (c) c.destroy();
  });
  timelineChart = null;
  featuresChart = null;
  genderChart = null;
  ageChart = null;
  isDrilledDown = false;
  drilldownFeature = null;
}

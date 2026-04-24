// ═══════════════════════════════════════════════════════════════════
// Tracker — Self-referential event capture
// Captures all dashboard interactions and sends them to POST /track
// ═══════════════════════════════════════════════════════════════════

const API_BASE = 'http://localhost:3001';

class Tracker {
  constructor() {
    this.queue = [];
    this.flushInterval = null;
    this.feedItems = [];
    this.maxFeedItems = 50;
  }

  /** Start the tracker — begins batching and flushing events */
  start() {
    // Flush event queue every 2 seconds
    this.flushInterval = setInterval(() => this.flush(), 2000);
    console.log('🔍 Tracker started — all interactions are being recorded');
  }

  /** Stop the tracker */
  stop() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  /** Track a feature click */
  track(featureName) {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.queue.push({
      feature_name: featureName,
      tracked_at: new Date().toISOString(),
    });

    // Add to live feed immediately
    this.addToFeed(featureName);
  }

  /** Flush the event queue to the API */
  async flush() {
    if (this.queue.length === 0) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    const events = [...this.queue];
    this.queue = [];

    // Send each event (could optimize with batch endpoint later)
    for (const event of events) {
      try {
        await fetch(`${API_BASE}/track`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ feature_name: event.feature_name }),
        });
      } catch (err) {
        console.warn('Track failed:', err);
      }
    }
  }

  /** Add event to the live feed UI */
  addToFeed(featureName) {
    const feedList = document.getElementById('feed-list');
    const feedCount = document.getElementById('feed-count');
    if (!feedList) return;

    // Remove empty message
    const emptyMsg = feedList.querySelector('.feed-empty');
    if (emptyMsg) emptyMsg.remove();

    // Get color for feature type
    const colors = {
      date_filter: '#f59e0b',
      gender_filter: '#ec4899',
      age_filter: '#8b5cf6',
      bar_chart_click: '#06b6d4',
      line_chart_click: '#22c55e',
      doughnut_chart_click: '#f97316',
      bar_chart_zoom: '#7c3aed',
      page_view: '#64748b',
      login: '#3b82f6',
      register: '#10b981',
    };

    const color = colors[featureName] || '#94a3b8';
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const time = new Date().toLocaleTimeString();

    // Create feed item
    const item = document.createElement('div');
    item.className = 'feed-item new';
    item.innerHTML = `
      <span class="feed-dot" style="background: ${color}"></span>
      <span class="feed-feature">${featureName}</span>
      <span class="feed-user">${user.username || 'anon'}</span>
      <span class="feed-time">${time}</span>
    `;

    // Add to top of feed
    feedList.insertBefore(item, feedList.firstChild);

    // Remove 'new' class after animation
    setTimeout(() => item.classList.remove('new'), 2000);

    // Track count
    this.feedItems.unshift(featureName);
    if (this.feedItems.length > this.maxFeedItems) {
      this.feedItems.pop();
      if (feedList.lastChild) feedList.removeChild(feedList.lastChild);
    }

    if (feedCount) {
      feedCount.textContent = `${this.feedItems.length} events`;
    }
  }
}

// Singleton
const tracker = new Tracker();
export default tracker;

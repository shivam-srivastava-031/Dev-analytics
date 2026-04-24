# 📊 Self-Referential Product Analytics Dashboard

> **Every click you make is tracked and visualized.** This dashboard visualizes its own usage — every filter change, chart click, and page view becomes a data point displayed in real-time.

![Dashboard Screenshot](https://img.shields.io/badge/Status-Live-brightgreen) ![Node.js](https://img.shields.io/badge/Node.js-18+-green) ![License](https://img.shields.io/badge/License-MIT-blue)

---

## 🎯 What It Does

A product analytics dashboard with a twist: **it tracks itself**. Product managers can explore feature usage data through interactive charts and advanced filtering. Every interaction generates a new data point that feeds back into the visualization, creating a self-referential feedback loop.

### Key Features
- **JWT Authentication** — Secure register/login with bcrypt password hashing
- **4 Interactive Charts** — Line, horizontal bar, doughnut, and bar charts (Chart.js)
- **Advanced Filtering** — Filter by date range, age group, and gender
- **Cookie-Based Filter Persistence** — Filters survive page refreshes
- **Bar → Line Drill-Down** — Click a feature bar to see its time-series trend
- **Live Event Feed** — Real-time scrolling feed of tracked interactions
- **Auto-Refresh** — Dashboard updates every 10 seconds to reflect new events
- **Data Seeding** — 5 demo users + 260 synthetic events pre-populated

---

## 🏗️ Architecture

```
analytics-dashboard/
├── package.json                 # Root package with dev scripts
├── server/                      # ── Backend (Express + SQLite) ──
│   ├── server.js                # Express entry point, middleware, CORS
│   ├── db.js                    # SQLite schema, indexes, seed data
│   ├── middleware.js             # JWT authentication middleware
│   └── routes/
│       ├── auth.js              # POST /register, POST /login
│       ├── track.js             # POST /track
│       └── analytics.js         # GET /analytics (aggregations + filters)
└── client/                      # ── Frontend (Vanilla JS + Chart.js) ──
    ├── index.html               # SPA shell (auth + dashboard views)
    ├── style.css                # Dark glassmorphism design system
    ├── main.js                  # App entry, view routing, session mgmt
    ├── auth.js                  # Login/register form handling
    ├── tracker.js               # Self-referential event capture engine
    ├── dashboard.js             # Dashboard orchestrator, filters, cookies
    └── charts.js                # Chart.js instances + drill-down logic
```

### Architectural Choices

| Decision | Rationale |
|----------|-----------|
| **SQLite** (`better-sqlite3`) | Zero-config, file-based database — no external services needed. Synchronous API means no async overhead for simple queries. Perfect for local dev and demos. |
| **Express.js** | Minimal, well-understood HTTP framework. No unnecessary abstraction layers for a focused REST API with 4 endpoints. |
| **Vanilla JS (no React/Vue)** | The dashboard is a single-page app with two views. A framework adds bundle size and complexity without proportional benefit here. ES modules provide clean separation of concerns. |
| **Chart.js 4** | Rich interactivity out of the box (`onClick`, `onHover`), responsive by default, and gradient fills/animations create a premium UX without D3's learning curve. |
| **JWT (stateless auth)** | Tokens stored in `localStorage` — the server doesn't need session storage. Simple, scalable, and works cleanly with the REST API pattern. |
| **Cookie-based filter persistence** | Native browser cookies — no library needed. Filters serialize to JSON and restore on page load. 30-day expiry ensures persistence across sessions. |
| **Event batching (2s flush)** | The tracker queues events and flushes every 2 seconds to avoid hammering the API on rapid interactions. Reduces network overhead while keeping data near real-time. |
| **Separation of concerns** | Backend: `db.js` (data layer) → `middleware.js` (auth) → `routes/*.js` (business logic) → `server.js` (composition). Frontend: `tracker.js` (capture) → `charts.js` (rendering) → `dashboard.js` (orchestration) → `main.js` (routing). |

---

## 🚀 Running Locally

### Prerequisites
- **Node.js** ≥ 18
- **npm** ≥ 8

### Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd analytics-dashboard

# 2. Install dependencies
npm install

# 3. Start both servers (backend + frontend)
npm run dev
```

This starts:
- **Backend API** → `http://localhost:3001`
- **Frontend** → `http://localhost:5173`

### Individual Commands

```bash
npm run server   # Start only the Express backend (port 3001)
npm run client   # Start only the Vite frontend (port 5173)
npm run dev      # Start both concurrently
```

### Demo Credentials

| Username | Password | Age | Gender |
|----------|----------|-----|--------|
| alice | password123 | 24 | Female |
| bob | password123 | 32 | Male |
| charlie | password123 | 19 | Male |
| diana | password123 | 45 | Female |
| sam | password123 | 28 | Other |

---

## 🌱 Seed Instructions

### Automatic Seeding (Default)

The database is **automatically seeded on first run** when the `users` table is empty. This generates:

- **5 demo users** with varied demographics (see table above)
- **260 synthetic feature click events** distributed across the past 30 days
- Events cover all feature types: `date_filter`, `gender_filter`, `age_filter`, `bar_chart_click`, `line_chart_click`, `doughnut_chart_click`, `bar_chart_zoom`, `page_view`

### Re-seeding

To reset the database and re-seed:

```bash
# Delete the SQLite database file
rm dashboard.db     # Linux/Mac
del dashboard.db    # Windows

# Restart the server — seed runs automatically
npm run server
```

### Custom Seed Data

Edit `server/db.js` to customize:
- **User count/demographics**: Modify the `seedUsers` array (line ~50)
- **Event volume**: Change the loop count from `260` (line ~80)
- **Date range**: Adjust `Math.random() * 30` for more/fewer days of history

---

## 📡 API Reference

### `POST /register`
Create a new user account.

```json
// Request
{ "username": "newuser", "password": "secret", "age": 25, "gender": "Male" }

// Response (201)
{ "token": "eyJhbG...", "user": { "id": 6, "username": "newuser", "age": 25, "gender": "Male" } }
```

### `POST /login`
Authenticate and receive a JWT.

```json
// Request
{ "username": "alice", "password": "password123" }

// Response (200)
{ "token": "eyJhbG...", "user": { "id": 1, "username": "alice", "age": 24, "gender": "Female" } }
```

### `POST /track` *(requires JWT)*
Record a feature click event.

```json
// Request (Authorization: Bearer <token>)
{ "feature_name": "bar_chart_click" }

// Response (201)
{ "success": true, "click": { "id": 261, "user_id": 1, "feature_name": "bar_chart_click", "timestamp": "2026-04-24T18:05:00.000Z" } }
```

### `GET /analytics` *(requires JWT)*
Retrieve aggregated analytics with optional filters.

```
GET /analytics?from=2026-04-01T00:00:00&to=2026-04-24T23:59:59&gender=Female&age_min=18&age_max=30
```

```json
// Response (200)
{
  "total_clicks": 523,
  "unique_users": 3,
  "clicks_over_time": [{ "date": "2026-04-20", "count": 45 }],
  "clicks_by_feature": [{ "feature_name": "date_filter", "count": 89 }],
  "clicks_by_gender": [{ "gender": "Female", "count": 210 }],
  "clicks_by_age_group": [{ "age_group": "18-25", "count": 150 }],
  "feature_drilldown": null
}
```

---

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,          -- bcrypt hash
  age      INTEGER NOT NULL,
  gender   TEXT NOT NULL CHECK(gender IN ('Male', 'Female', 'Other')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Feature Clicks Table
```sql
CREATE TABLE feature_clicks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL,
  feature_name TEXT NOT NULL,
  timestamp    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Performance indexes
CREATE INDEX idx_clicks_user      ON feature_clicks(user_id);
CREATE INDEX idx_clicks_feature   ON feature_clicks(feature_name);
CREATE INDEX idx_clicks_timestamp ON feature_clicks(timestamp);
```

---

## 📐 The Self-Referential Feedback Loop

```
┌─────────────────────────────────────────────────────────────────┐
│  User clicks "Clicks by Feature" bar chart                      │
│       ↓                                                         │
│  tracker.js captures "bar_chart_click" event                    │
│       ↓                                                         │
│  Event batched → POST /track → SQLite INSERT                    │
│       ↓                                                         │
│  Dashboard auto-refreshes (10s) → GET /analytics                │
│       ↓                                                         │
│  Chart updates — "bar_chart_click" count increases              │
│       ↓                                                         │
│  User sees their own click reflected in the chart! 🔄           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📝 Scaling Essay: Handling 1 Million Write-Events Per Minute

> **If this dashboard needed to handle 1 million write-events per minute, how would you change your backend architecture?**

At 1M writes/min (~16,667/sec), the current synchronous SQLite approach would buckle immediately. The architecture would need a fundamental shift across three axes:

**1. Write Path — Decouple ingestion from storage.** Replace the direct `POST /track → SQLite INSERT` path with an event streaming layer. Events would POST to a lightweight ingestion service that writes to **Apache Kafka** (or AWS Kinesis) as an append-only log. Kafka partitions by `user_id` for ordering guarantees, and handles backpressure naturally. Multiple consumer groups then drain from Kafka: one writes to **ClickHouse** or **Apache Druid** (columnar stores purpose-built for high-volume time-series analytics), another feeds a **Redis Streams** buffer for real-time counters.

**2. Read Path — Pre-aggregate, don't query raw.** At this volume, computing `GROUP BY feature_name` on raw rows for every dashboard load is prohibitively expensive. Instead, use **materialized views** or **Kafka Streams/Flink** to maintain rolling aggregation tables (clicks per feature per hour, clicks per gender per day). The `GET /analytics` endpoint reads from these pre-computed summaries, reducing query time from seconds to single-digit milliseconds.

**3. Infrastructure — Horizontal scaling.** The monolithic Express server becomes a fleet of stateless API pods behind a load balancer (Kubernetes). The ingestion service and analytics service are separate microservices, independently scalable. PostgreSQL (if retained) would use **read replicas** for analytics queries and **connection pooling** (PgBouncer) to manage connections. Rate limiting at the API gateway (e.g., Kong, AWS API Gateway) protects against burst traffic.

The key insight: **writes and reads have fundamentally different access patterns at scale, so they must be separated** (CQRS pattern). The write path optimizes for throughput (append-only, partitioned, async), while the read path optimizes for query speed (pre-aggregated, cached, denormalized).

---

## 📄 License

MIT

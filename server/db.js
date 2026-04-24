import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'dashboard.db');

const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ──────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL CHECK(gender IN ('Male', 'Female', 'Other')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS feature_clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    feature_name TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_clicks_user ON feature_clicks(user_id);
  CREATE INDEX IF NOT EXISTS idx_clicks_feature ON feature_clicks(feature_name);
  CREATE INDEX IF NOT EXISTS idx_clicks_timestamp ON feature_clicks(timestamp);
`);

// ── Seed Data ───────────────────────────────────────────────────────
function seedData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) return; // Already seeded

  console.log('🌱 Seeding demo data...');

  const seedUsers = [
    { username: 'alice',   password: 'password123', age: 24, gender: 'Female' },
    { username: 'bob',     password: 'password123', age: 32, gender: 'Male' },
    { username: 'charlie', password: 'password123', age: 19, gender: 'Male' },
    { username: 'diana',   password: 'password123', age: 45, gender: 'Female' },
    { username: 'sam',     password: 'password123', age: 28, gender: 'Other' },
  ];

  const insertUser = db.prepare(
    'INSERT INTO users (username, password, age, gender) VALUES (?, ?, ?, ?)'
  );

  const userIds = [];
  for (const u of seedUsers) {
    const hash = bcrypt.hashSync(u.password, 10);
    const info = insertUser.run(u.username, hash, u.age, u.gender);
    userIds.push(info.lastInsertRowid);
  }

  // Feature names to seed
  const features = [
    'date_filter', 'gender_filter', 'age_filter',
    'bar_chart_click', 'line_chart_click', 'doughnut_chart_click',
    'bar_chart_zoom', 'page_view',
  ];

  const insertClick = db.prepare(
    'INSERT INTO feature_clicks (user_id, feature_name, timestamp) VALUES (?, ?, ?)'
  );

  const now = Date.now();
  const DAY = 86400000;

  // Generate 250+ events over the past 30 days
  const insertMany = db.transaction(() => {
    for (let i = 0; i < 260; i++) {
      const userId = userIds[Math.floor(Math.random() * userIds.length)];
      const feature = features[Math.floor(Math.random() * features.length)];
      const daysAgo = Math.floor(Math.random() * 30);
      const hoursOffset = Math.floor(Math.random() * 24);
      const ts = new Date(now - daysAgo * DAY + hoursOffset * 3600000);
      insertClick.run(userId, feature, ts.toISOString());
    }
  });

  insertMany();
  console.log('✅ Seeded 5 users and 260 feature click events');
}

seedData();

export default db;

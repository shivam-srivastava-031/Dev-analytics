import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import trackRoutes from './routes/track.js';
import analyticsRoutes from './routes/analytics.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ───────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  // Add your Vercel frontend URL here (no trailing slash)
  process.env.CLIENT_URL || 'https://dev-analytics-phi.vercel.app',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, Postman, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());

// ── Static Files (UI) ────────────────────────────────────────────────
// Serve the static frontend from the client folder
app.use(express.static(path.join(__dirname, '..', 'client')));

// ── API Routes ──────────────────────────────────────────────────────
app.use('/', authRoutes);      // POST /register, POST /login
app.use('/', trackRoutes);     // POST /track
app.use('/', analyticsRoutes); // GET /analytics

// ── Root Handler ────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

// ── Health Check ────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Start ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Analytics Dashboard API running at http://localhost:${PORT}`);
  console.log(`   POST /register  — Create a new user`);
  console.log(`   POST /login     — Authenticate`);
  console.log(`   POST /track     — Record a feature click`);
  console.log(`   GET  /analytics — Aggregated analytics data\n`);
});

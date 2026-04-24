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
app.use(cors());
app.use(express.json());

// ── API Routes ──────────────────────────────────────────────────────
app.use('/', authRoutes);      // POST /register, POST /login
app.use('/', trackRoutes);     // POST /track
app.use('/', analyticsRoutes); // GET /analytics

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

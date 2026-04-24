// ═══════════════════════════════════════════════════════════════════
// Config — Shared API base URL
// In production (Vercel), set VITE_API_URL env var to your backend URL
// e.g. https://dev-analytics-api.onrender.com
// ═══════════════════════════════════════════════════════════════════

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

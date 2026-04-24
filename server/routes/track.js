import { Router } from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware.js';

const router = Router();

// POST /track — Record a feature click
router.post('/track', authenticateToken, (req, res) => {
  try {
    const { feature_name } = req.body;

    if (!feature_name) {
      return res.status(400).json({ error: 'feature_name is required' });
    }

    const info = db.prepare(
      'INSERT INTO feature_clicks (user_id, feature_name) VALUES (?, ?)'
    ).run(req.user.id, feature_name);

    const click = db.prepare('SELECT * FROM feature_clicks WHERE id = ?').get(info.lastInsertRowid);

    res.status(201).json({ success: true, click });
  } catch (err) {
    console.error('Track error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

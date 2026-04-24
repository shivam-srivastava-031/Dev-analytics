import { Router } from 'express';
import db from '../db.js';
import { authenticateToken } from '../middleware.js';

const router = Router();

// GET /analytics — Aggregated data with filters
router.get('/analytics', authenticateToken, (req, res) => {
  try {
    const { from, to, age_min, age_max, gender } = req.query;

    // Build dynamic WHERE clauses
    let conditions = [];
    let params = [];

    if (from) {
      conditions.push('fc.timestamp >= ?');
      params.push(from);
    }
    if (to) {
      conditions.push('fc.timestamp <= ?');
      params.push(to);
    }
    if (age_min) {
      conditions.push('u.age >= ?');
      params.push(Number(age_min));
    }
    if (age_max) {
      conditions.push('u.age <= ?');
      params.push(Number(age_max));
    }
    if (gender) {
      conditions.push('u.gender = ?');
      params.push(gender);
    }

    const whereClause = conditions.length > 0
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    // 1) Total clicks
    const totalRow = db.prepare(`
      SELECT COUNT(*) as total_clicks
      FROM feature_clicks fc
      JOIN users u ON fc.user_id = u.id
      ${whereClause}
    `).get(...params);

    // 2) Unique users
    const uniqueRow = db.prepare(`
      SELECT COUNT(DISTINCT fc.user_id) as unique_users
      FROM feature_clicks fc
      JOIN users u ON fc.user_id = u.id
      ${whereClause}
    `).get(...params);

    // 3) Clicks over time (grouped by date)
    const clicksOverTime = db.prepare(`
      SELECT DATE(fc.timestamp) as date, COUNT(*) as count
      FROM feature_clicks fc
      JOIN users u ON fc.user_id = u.id
      ${whereClause}
      GROUP BY DATE(fc.timestamp)
      ORDER BY date ASC
    `).all(...params);

    // 4) Clicks by feature
    const clicksByFeature = db.prepare(`
      SELECT fc.feature_name, COUNT(*) as count
      FROM feature_clicks fc
      JOIN users u ON fc.user_id = u.id
      ${whereClause}
      GROUP BY fc.feature_name
      ORDER BY count DESC
    `).all(...params);

    // 5) Clicks by gender
    const clicksByGender = db.prepare(`
      SELECT u.gender, COUNT(*) as count
      FROM feature_clicks fc
      JOIN users u ON fc.user_id = u.id
      ${whereClause}
      GROUP BY u.gender
      ORDER BY count DESC
    `).all(...params);

    // 6) Clicks by age group
    const clicksByAgeGroup = db.prepare(`
      SELECT
        CASE
          WHEN u.age < 18 THEN 'Under 18'
          WHEN u.age BETWEEN 18 AND 25 THEN '18-25'
          WHEN u.age BETWEEN 26 AND 35 THEN '26-35'
          WHEN u.age BETWEEN 36 AND 50 THEN '36-50'
          ELSE '50+'
        END as age_group,
        COUNT(*) as count
      FROM feature_clicks fc
      JOIN users u ON fc.user_id = u.id
      ${whereClause}
      GROUP BY age_group
      ORDER BY MIN(u.age) ASC
    `).all(...params);

    // 7) Clicks over time for a specific feature (for drill-down)
    let featureDrilldown = null;
    if (req.query.feature) {
      const drillParams = [...params, req.query.feature];
      featureDrilldown = db.prepare(`
        SELECT DATE(fc.timestamp) as date, COUNT(*) as count
        FROM feature_clicks fc
        JOIN users u ON fc.user_id = u.id
        ${whereClause ? whereClause + ' AND' : 'WHERE'} fc.feature_name = ?
        GROUP BY DATE(fc.timestamp)
        ORDER BY date ASC
      `).all(...drillParams);
    }

    res.json({
      total_clicks: totalRow.total_clicks,
      unique_users: uniqueRow.unique_users,
      clicks_over_time: clicksOverTime,
      clicks_by_feature: clicksByFeature,
      clicks_by_gender: clicksByGender,
      clicks_by_age_group: clicksByAgeGroup,
      feature_drilldown: featureDrilldown,
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

'use strict';

const express = require('express');
const { getDb }          = require('../db/database');
const { requireManager } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/audit-logs ──────────────────────────────────────────────────────
router.get('/', requireManager, (req, res) => {
  try {
    const db = getDb();
    const { user_id, action, result, from, to, page = 1, limit = 100 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query  = `
      SELECT al.*, u.username
      FROM AuditLogs al
      LEFT JOIN Users u ON u.id = al.user_id
      WHERE 1=1
    `;
    const params = [];

    if (user_id) {
      query += ' AND al.user_id = ?';
      params.push(parseInt(user_id, 10));
    }
    if (action) {
      query += ' AND al.action LIKE ?';
      params.push(`%${action}%`);
    }
    if (result) {
      query += ' AND al.result = ?';
      params.push(result.toUpperCase());
    }
    if (from) {
      query += ' AND al.created_at >= ?';
      params.push(from);
    }
    if (to) {
      query += ' AND al.created_at <= ?';
      params.push(to + 'T23:59:59Z');
    }

    query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), offset);

    const logs  = db.prepare(query).all(...params);
    const total = db.prepare('SELECT COUNT(*) AS cnt FROM AuditLogs').get().cnt;

    return res.json({ logs, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  } catch (err) {
    console.error('[Audit] GET / error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

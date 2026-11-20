'use strict';

const express = require('express');
const { getDb }          = require('../db/database');
const { requireManager } = require('../middleware/auth');
const { recalculateAllRisks } = require('../services/expiryService');

const router = express.Router();

// ── GET /api/expiry/risks ────────────────────────────────────────────────────
router.get('/risks', requireManager, (req, res) => {
  try {
    const db = getDb();
    const { risk_level, page = 1, limit = 100 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query  = `
      SELECT er.*,
             p.name AS product_name, p.category, p.barcode, p.unit_price,
             pb.batch_number, pb.expiry_date, pb.cost_price
      FROM ExpiryRisks er
      JOIN Products p  ON p.id  = er.product_id
      JOIN ProductBatches pb ON pb.id = er.batch_id
      WHERE 1=1
    `;
    const params = [];

    if (risk_level) {
      query += ' AND er.risk_level = ?';
      params.push(risk_level.toUpperCase());
    }

    query += ' ORDER BY er.days_before_expiry ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), offset);

    const risks = db.prepare(query).all(...params);
    const total = db.prepare('SELECT COUNT(*) AS cnt FROM ExpiryRisks' + (risk_level ? ' WHERE risk_level = ?' : '')).get(...(risk_level ? [risk_level.toUpperCase()] : [])).cnt;

    return res.json({ risks, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  } catch (err) {
    console.error('[Expiry] GET /risks error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/expiry/recalculate ─────────────────────────────────────────────
// Manual trigger for managers (useful for testing / on-demand refresh)
router.post('/recalculate', requireManager, (req, res) => {
  try {
    recalculateAllRisks();
    return res.json({ message: 'Expiry risks recalculated' });
  } catch (err) {
    console.error('[Expiry] POST /recalculate error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

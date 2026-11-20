'use strict';

const express = require('express');
const { getDb }          = require('../db/database');
const { requireManager } = require('../middleware/auth');

const router = express.Router();

// ── GET /api/reports/waste ───────────────────────────────────────────────────
router.get('/waste', requireManager, (req, res) => {
  try {
    const db = getDb();
    const { from, to, page = 1, limit = 100 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query  = `
      SELECT wh.*,
             p.name AS product_name, p.category,
             pb.batch_number, pb.expiry_date, pb.cost_price,
             u.username AS manager_name
      FROM WasteHistory wh
      JOIN Products p  ON p.id  = wh.product_id
      JOIN ProductBatches pb ON pb.id = wh.batch_id
      LEFT JOIN ManagerActions ma ON ma.id = wh.manager_action_id
      LEFT JOIN Users u ON u.id = ma.manager_id
      WHERE 1=1
    `;
    const params = [];

    if (from) {
      query += ' AND wh.created_at >= ?';
      params.push(from);
    }
    if (to) {
      query += ' AND wh.created_at <= ?';
      params.push(to + 'T23:59:59Z');
    }

    query += ' ORDER BY wh.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), offset);

    const records = db.prepare(query).all(...params);

    // Aggregate summary
    const summary = db.prepare(`
      SELECT
        wh.waste_status,
        COUNT(*) AS count,
        SUM(wh.quantity) AS total_qty,
        SUM(wh.quantity * pb.cost_price) AS total_cost_value
      FROM WasteHistory wh
      JOIN ProductBatches pb ON pb.id = wh.batch_id
      GROUP BY wh.waste_status
    `).all();

    const total = db.prepare('SELECT COUNT(*) AS cnt FROM WasteHistory').get().cnt;

    return res.json({ records, summary, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  } catch (err) {
    console.error('[Reports] GET /waste error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/reports/expiry-trends ──────────────────────────────────────────
router.get('/expiry-trends', requireManager, (req, res) => {
  try {
    const db = getDb();

    // Count of risks by level today
    const riskSummary = db.prepare(`
      SELECT risk_level, COUNT(*) AS count, SUM(remaining_quantity) AS total_qty
      FROM ExpiryRisks
      GROUP BY risk_level
    `).all();

    // Products with fastest consumption vs days remaining
    const atRiskProducts = db.prepare(`
      SELECT
        er.risk_level,
        er.days_before_expiry,
        er.remaining_quantity,
        er.sales_rate,
        p.name AS product_name,
        p.category,
        pb.batch_number,
        pb.expiry_date,
        p.unit_price,
        CASE WHEN er.sales_rate > 0
          THEN ROUND(er.remaining_quantity / er.sales_rate, 1)
          ELSE NULL
        END AS days_to_sell
      FROM ExpiryRisks er
      JOIN Products p  ON p.id  = er.product_id
      JOIN ProductBatches pb ON pb.id = er.batch_id
      WHERE er.risk_level IN ('HIGH','MEDIUM','EXPIRED')
      ORDER BY er.days_before_expiry ASC
    `).all();

    // Sales trend: units sold per day for last 14 days
    const salesTrend = db.prepare(`
      SELECT
        DATE(s.created_at) AS sale_date,
        COUNT(DISTINCT s.sale_id) AS num_sales,
        SUM(si.quantity) AS units_sold,
        SUM(si.subtotal) AS revenue
      FROM Sales s
      JOIN SaleItems si ON si.sale_id = s.sale_id
      WHERE s.payment_status = 'SUCCESS'
        AND s.created_at >= DATE('now', '-14 days')
      GROUP BY DATE(s.created_at)
      ORDER BY sale_date ASC
    `).all();

    // Expiry alerts over time
    const alertTrend = db.prepare(`
      SELECT
        DATE(created_at) AS alert_date,
        risk_level,
        COUNT(*) AS count
      FROM Alerts
      WHERE created_at >= DATE('now', '-14 days')
      GROUP BY DATE(created_at), risk_level
      ORDER BY alert_date ASC
    `).all();

    return res.json({ riskSummary, atRiskProducts, salesTrend, alertTrend });
  } catch (err) {
    console.error('[Reports] GET /expiry-trends error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

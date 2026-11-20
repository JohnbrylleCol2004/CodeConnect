'use strict';

const express = require('express');
const { getDb }          = require('../db/database');
const { requireManager } = require('../middleware/auth');
const { validate, validateDate, validatePositiveNumber, validateInt } = require('../middleware/validate');
const { calculateRisk }  = require('../services/expiryService');
const { logAudit }       = require('../services/auditService');

const router = express.Router();

// ── GET /api/batches ─────────────────────────────────────────────────────────
router.get('/', requireManager, (req, res) => {
  try {
    const db = getDb();
    const { product_id, page = 1, limit = 100 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query = `
      SELECT pb.*, p.name AS product_name, p.category, p.unit_price,
             er.risk_level, er.days_before_expiry, er.sales_rate
      FROM ProductBatches pb
      JOIN Products p ON p.id = pb.product_id
      LEFT JOIN ExpiryRisks er ON er.batch_id = pb.id
      WHERE 1=1
    `;
    const params = [];

    if (product_id) {
      query += ' AND pb.product_id = ?';
      params.push(parseInt(product_id, 10));
    }

    query += ' ORDER BY pb.expiry_date ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), offset);

    const batches = db.prepare(query).all(...params);
    const total = db.prepare('SELECT COUNT(*) AS cnt FROM ProductBatches').get().cnt;

    return res.json({ batches, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  } catch (err) {
    console.error('[Batches] GET / error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/batches ────────────────────────────────────────────────────────
router.post('/', requireManager, validate(['product_id', 'batch_number', 'quantity', 'expiry_date', 'cost_price']), (req, res) => {
  const { product_id, batch_number, quantity, expiry_date, cost_price } = req.body;

  // Validate types
  if (!validateInt(quantity, 1)) {
    return res.status(400).json({ error: 'quantity must be a positive integer' });
  }
  if (!validatePositiveNumber(cost_price)) {
    return res.status(400).json({ error: 'cost_price must be a positive number' });
  }
  if (!validateDate(expiry_date)) {
    return res.status(400).json({ error: 'expiry_date must be YYYY-MM-DD' });
  }

  const pid = parseInt(product_id, 10);
  if (isNaN(pid)) {
    return res.status(400).json({ error: 'Invalid product_id' });
  }

  try {
    const db = getDb();

    const product = db.prepare('SELECT id FROM Products WHERE id = ?').get(pid);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const existing = db.prepare(
      'SELECT id FROM ProductBatches WHERE product_id = ? AND batch_number = ?'
    ).get(pid, batch_number);
    if (existing) {
      return res.status(409).json({ error: 'Batch number already exists for this product' });
    }

    const qty = parseInt(quantity, 10);
    const result = db.prepare(`
      INSERT INTO ProductBatches (product_id, batch_number, quantity, remaining_quantity, expiry_date, cost_price)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(pid, batch_number.trim(), qty, qty, expiry_date, parseFloat(cost_price));

    const batch = db.prepare('SELECT * FROM ProductBatches WHERE id = ?').get(result.lastInsertRowid);

    // Calculate initial risk for the new batch
    calculateRisk(batch);

    logAudit({
      userId: req.user.id, role: req.user.role,
      action: 'CREATE_BATCH', affectedTable: 'ProductBatches', affectedId: batch.id
    });

    return res.status(201).json(batch);
  } catch (err) {
    console.error('[Batches] POST / error:', err);
    logAudit({ userId: req.user.id, role: req.user.role, action: 'CREATE_BATCH', result: 'FAILURE', errorInfo: err.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

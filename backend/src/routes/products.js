'use strict';

const express = require('express');
const { getDb }          = require('../db/database');
const { requireAuth, requireManager } = require('../middleware/auth');
const { validate, validatePositiveNumber, validateDate } = require('../middleware/validate');
const { logAudit }       = require('../services/auditService');

const router = express.Router();

// ── GET /api/products ────────────────────────────────────────────────────────
router.get('/', requireAuth, (req, res) => {
  try {
    const db       = getDb();
    const { category, search, page = 1, limit = 50 } = req.query;
    const offset   = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query  = 'SELECT * FROM Products WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    if (search) {
      query += ' AND (name LIKE ? OR barcode LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY name ASC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), offset);

    const products = db.prepare(query).all(...params);
    const total    = db.prepare('SELECT COUNT(*) AS cnt FROM Products').get().cnt;

    return res.json({ products, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  } catch (err) {
    console.error('[Products] GET / error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/products ───────────────────────────────────────────────────────
router.post('/', requireManager, validate(['name', 'category', 'unit_price']), (req, res) => {
  const { name, category, unit_price, barcode } = req.body;

  if (!validatePositiveNumber(unit_price)) {
    return res.status(400).json({ error: 'unit_price must be a positive number' });
  }

  try {
    const db = getDb();

    if (barcode) {
      const existing = db.prepare('SELECT id FROM Products WHERE barcode = ?').get(barcode);
      if (existing) {
        return res.status(409).json({ error: 'Barcode already registered' });
      }
    }

    const result = db.prepare(`
      INSERT INTO Products (name, category, unit_price, barcode)
      VALUES (?, ?, ?, ?)
    `).run(name.trim(), category.trim(), parseFloat(unit_price), barcode || null);

    const product = db.prepare('SELECT * FROM Products WHERE id = ?').get(result.lastInsertRowid);

    logAudit({
      userId: req.user.id, role: req.user.role,
      action: 'CREATE_PRODUCT', affectedTable: 'Products', affectedId: product.id
    });

    return res.status(201).json(product);
  } catch (err) {
    console.error('[Products] POST / error:', err);
    logAudit({ userId: req.user.id, role: req.user.role, action: 'CREATE_PRODUCT', result: 'FAILURE', errorInfo: err.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GET /api/products/:id/batches ────────────────────────────────────────────
router.get('/:id/batches', requireAuth, (req, res) => {
  const productId = parseInt(req.params.id, 10);
  if (isNaN(productId)) {
    return res.status(400).json({ error: 'Invalid product id' });
  }

  try {
    const db = getDb();

    const product = db.prepare('SELECT * FROM Products WHERE id = ?').get(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const batches = db.prepare(`
      SELECT pb.*, er.risk_level, er.days_before_expiry, er.sales_rate, er.calculated_at
      FROM ProductBatches pb
      LEFT JOIN ExpiryRisks er ON er.batch_id = pb.id
      WHERE pb.product_id = ?
      ORDER BY pb.expiry_date ASC
    `).all(productId);

    return res.json({ product, batches });
  } catch (err) {
    console.error('[Products] GET /:id/batches error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

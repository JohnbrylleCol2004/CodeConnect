'use strict';

const express  = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb }          = require('../db/database');
const { requireAuth }    = require('../middleware/auth');
const { validate, validateInt } = require('../middleware/validate');
const { getFEFOAllocations, calculateRisk } = require('../services/expiryService');
const { logAudit }       = require('../services/auditService');
const { withRetry }      = require('../utils/retry');

const router = express.Router();

const CHECKOUT_TIMEOUT_MS = 10_000; // 10 seconds

// ── POST /api/sales/checkout ─────────────────────────────────────────────────
router.post('/checkout', requireAuth, validate(['saleId', 'items']), async (req, res) => {
  const { saleId, items, payment_status } = req.body;
  const cashierId = req.user.id;

  // Validate saleId format (UUID)
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(saleId)) {
    return res.status(400).json({ error: 'saleId must be a valid UUID v4' });
  }

  // Validate items array
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' });
  }
  for (const item of items) {
    if (!item.product_id || !validateInt(item.quantity, 1)) {
      return res.status(400).json({ error: 'Each item requires product_id and quantity >= 1' });
    }
  }

  const db = getDb();

  // ── Duplicate sale check ───────────────────────────────────────────────────
  const existing = db.prepare('SELECT id, payment_status FROM Sales WHERE sale_id = ?').get(saleId);
  if (existing) {
    if (db.prepare('SELECT 1 FROM QrPayments WHERE sale_id = ?').get(saleId)) {
      return res.status(409).json({ error: 'This sale has a QR payment; check its payment status instead', saleId });
    }
    if (existing.payment_status === 'SUCCESS') {
      return res.status(409).json({ error: 'Duplicate sale – already processed', saleId });
    }
    // Allow re-attempt for PENDING / REJECTED
  }

  let paymentResolved = false;
  let finalStatus     = 'PENDING';

  // ── Timeout promise ────────────────────────────────────────────────────────
  const timeoutPromise = new Promise(resolve =>
    setTimeout(() => resolve({ timedOut: true }), CHECKOUT_TIMEOUT_MS)
  );

  // ── Checkout logic wrapped in retry ───────────────────────────────────────
  const checkoutPromise = withRetry(async () => {
    // Run everything in a single DB transaction
    const result = db.transaction(() => {
      // 1. Resolve product details + FEFO allocations
      const lineItems = [];
      let totalAmount = 0;

      for (const item of items) {
        const pid = parseInt(item.product_id, 10);
        const qty = parseInt(item.quantity, 10);

        const product = db.prepare('SELECT * FROM Products WHERE id = ?').get(pid);
        if (!product) throw Object.assign(new Error(`Product ${pid} not found`), { status: 404 });

        const allocations = getFEFOAllocations(pid, qty);

        for (const { batch, allocate } of allocations) {
          const subtotal = allocate * product.unit_price;
          totalAmount   += subtotal;
          lineItems.push({ product, batch, quantity: allocate, unit_price: product.unit_price, subtotal });
        }
      }

      // 2. Upsert the Sale record
      const saleExists = db.prepare('SELECT id FROM Sales WHERE sale_id = ?').get(saleId);
      if (!saleExists) {
        db.prepare(`
          INSERT INTO Sales (sale_id, cashier_id, total_amount, payment_status)
          VALUES (?, ?, ?, 'PENDING')
        `).run(saleId, cashierId, totalAmount);
      } else {
        db.prepare(`
          UPDATE Sales SET total_amount = ?, payment_status = 'PENDING' WHERE sale_id = ?
        `).run(totalAmount, saleId);
        // Remove old sale items before reinserting
        db.prepare('DELETE FROM SaleItems WHERE sale_id = ?').run(saleId);
      }

      // 3. Insert SaleItems + deduct inventory
      for (const li of lineItems) {
        db.prepare(`
          INSERT INTO SaleItems (sale_id, product_id, batch_id, quantity, unit_price, subtotal)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(saleId, li.product.id, li.batch.id, li.quantity, li.unit_price, li.subtotal);

        db.prepare(`
          UPDATE ProductBatches SET remaining_quantity = remaining_quantity - ? WHERE id = ?
        `).run(li.quantity, li.batch.id);
      }

      return { lineItems, totalAmount };
    })();

    return result;
  }, { maxAttempts: 3, delays: [2000, 4000, 8000] });

  // ── Race checkout vs timeout ───────────────────────────────────────────────
  let checkoutResult;
  try {
    const raceResult = await Promise.race([checkoutPromise, timeoutPromise]);

    if (raceResult && raceResult.timedOut) {
      // Mark sale as PENDING if it was inserted
      db.prepare(`UPDATE Sales SET payment_status = 'PENDING' WHERE sale_id = ?`).run(saleId);
      logAudit({
        userId: cashierId, role: req.user.role,
        action: 'CHECKOUT_TIMEOUT', affectedTable: 'Sales', affectedId: saleId,
        result: 'FAILURE', errorInfo: 'Checkout timed out after 10s'
      });
      return res.status(202).json({ message: 'Checkout timed out – sale marked PENDING', saleId, payment_status: 'PENDING' });
    }

    checkoutResult = raceResult;
    paymentResolved = true;
    finalStatus     = payment_status === 'REJECTED' ? 'REJECTED' : 'SUCCESS';
  } catch (err) {
    // Retry exhausted
    db.prepare(`UPDATE Sales SET payment_status = 'REJECTED' WHERE sale_id = ?`).run(saleId);
    logAudit({
      userId: cashierId, role: req.user.role,
      action: 'CHECKOUT', affectedTable: 'Sales', affectedId: saleId,
      result: 'FAILURE', errorInfo: err.message
    });

    if (err.code === 'INSUFFICIENT_STOCK') {
      return res.status(422).json({ error: err.message });
    }
    if (err.status === 404) {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Checkout failed after retries', detail: err.message });
  }

  // ── Finalise sale status ───────────────────────────────────────────────────
  db.prepare(`UPDATE Sales SET payment_status = ? WHERE sale_id = ?`).run(finalStatus, saleId);

  // ── Recalculate risk for affected batches ──────────────────────────────────
  const affectedBatchIds = [...new Set(checkoutResult.lineItems.map(li => li.batch.id))];
  for (const batchId of affectedBatchIds) {
    const updatedBatch = db.prepare('SELECT * FROM ProductBatches WHERE id = ?').get(batchId);
    if (updatedBatch) {
      try { calculateRisk(updatedBatch); } catch (_) {}
    }
  }

  // ── Audit log ─────────────────────────────────────────────────────────────
  logAudit({
    userId: cashierId, role: req.user.role,
    action: 'CHECKOUT', affectedTable: 'Sales', affectedId: saleId,
    result: finalStatus === 'REJECTED' ? 'FAILURE' : 'SUCCESS'
  });

  // ── Response ──────────────────────────────────────────────────────────────
  const sale = db.prepare('SELECT * FROM Sales WHERE sale_id = ?').get(saleId);
  const saleItems = db.prepare(`
    SELECT si.*, p.name AS product_name, pb.batch_number, pb.expiry_date
    FROM SaleItems si
    JOIN Products p ON p.id = si.product_id
    JOIN ProductBatches pb ON pb.id = si.batch_id
    WHERE si.sale_id = ?
  `).all(saleId);

  return res.status(201).json({ sale, items: saleItems });
});

// ── GET /api/sales/:saleId/receipt ───────────────────────────────────────────
router.get('/:saleId/receipt', requireAuth, (req, res) => {
  const { saleId } = req.params;

  try {
    const db = getDb();

    const sale = db.prepare(`
      SELECT s.*, u.username AS cashier_name
      FROM Sales s
      JOIN Users u ON u.id = s.cashier_id
      WHERE s.sale_id = ?
    `).get(saleId);

    if (!sale) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    if (sale.payment_status !== 'SUCCESS') {
      return res.status(409).json({ error: 'Receipt is available after payment succeeds' });
    }

    // Cashiers can only see their own receipts; managers see all
    if (req.user.role === 'cashier' && sale.cashier_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const items = db.prepare(`
      SELECT si.*, p.name AS product_name, p.category, p.barcode,
             pb.batch_number, pb.expiry_date
      FROM SaleItems si
      JOIN Products p ON p.id = si.product_id
      JOIN ProductBatches pb ON pb.id = si.batch_id
      WHERE si.sale_id = ?
    `).all(saleId);

    return res.json({
      receipt: {
        saleId:        sale.sale_id,
        cashier:       sale.cashier_name,
        totalAmount:   sale.total_amount,
        paymentStatus: sale.payment_status,
        paymentMethod: db.prepare('SELECT 1 FROM QrPayments WHERE sale_id = ?').get(saleId) ? 'QR Ph' : 'In-store',
        createdAt:     sale.created_at,
        items
      }
    });
  } catch (err) {
    console.error('[Sales] GET receipt error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

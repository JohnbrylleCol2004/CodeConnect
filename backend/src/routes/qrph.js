'use strict';

const express = require('express');
const { getDb } = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const { getFEFOAllocations, calculateRisk } = require('../services/expiryService');
const { createQrPayment, getPaymentIntent } = require('../services/paymongoService');
const { logAudit } = require('../services/auditService');

const router = express.Router();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.post('/', requireAuth, async (req, res) => {
  const { saleId, items } = req.body || {};
  if (!UUID_RE.test(saleId) || !Array.isArray(items) || items.length === 0 ||
      items.some(item => !Number.isSafeInteger(Number(item.product_id)) || !Number.isSafeInteger(Number(item.quantity)) || Number(item.quantity) < 1)) {
    return res.status(400).json({ error: 'Valid saleId and items are required' });
  }
  if (!process.env.PAYMONGO_SECRET_KEY || !process.env.PAYMONGO_PUBLIC_KEY) {
    return res.status(503).json({ error: 'PayMongo API keys are not configured' });
  }

  const db = getDb();
  try {
    const amountCentavos = db.transaction(() => {
      if (db.prepare('SELECT 1 FROM Sales WHERE sale_id = ?').get(saleId)) {
        throw Object.assign(new Error('Sale already exists'), { status: 409 });
      }
      const quantities = new Map();
      for (const item of items) {
        const id = Number(item.product_id);
        quantities.set(id, (quantities.get(id) || 0) + Number(item.quantity));
      }
      const lines = [];
      let totalCentavos = 0;
      for (const [id, quantity] of quantities) {
        const product = db.prepare('SELECT id, unit_price FROM Products WHERE id = ?').get(id);
        if (!product) throw Object.assign(new Error(`Product ${id} not found`), { status: 404 });
        for (const { batch, allocate } of getFEFOAllocations(id, quantity)) {
          const cents = Math.round(product.unit_price * 100) * allocate;
          totalCentavos += cents;
          lines.push({ productId: id, batchId: batch.id, quantity: allocate, unitPrice: product.unit_price, subtotal: cents / 100 });
        }
      }
      if (!Number.isSafeInteger(totalCentavos) || totalCentavos < 100) {
        throw Object.assign(new Error('QR Ph requires at least PHP 1.00'), { status: 400 });
      }
      db.prepare("INSERT INTO Sales (sale_id, cashier_id, total_amount, payment_status) VALUES (?, ?, ?, 'PENDING')")
        .run(saleId, req.user.id, totalCentavos / 100);
      const insertItem = db.prepare('INSERT INTO SaleItems (sale_id, product_id, batch_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?)');
      for (const line of lines) insertItem.run(saleId, line.productId, line.batchId, line.quantity, line.unitPrice, line.subtotal);
      db.prepare('INSERT INTO QrPayments (sale_id, amount_centavos) VALUES (?, ?)').run(saleId, totalCentavos);
      return totalCentavos;
    })();

    try {
      const payment = await createQrPayment(saleId, amountCentavos);
      if (!payment.imageUrl || !['awaiting_next_action', 'succeeded'].includes(payment.status)) {
        throw Object.assign(new Error('PayMongo did not return a QR code'), { status: 502 });
      }
      db.prepare('UPDATE QrPayments SET intent_id = ? WHERE sale_id = ?').run(payment.intentId, saleId);
      return res.status(201).json({ saleId, paymentStatus: 'PENDING', qrImage: payment.imageUrl, testUrl: process.env.PAYMONGO_SECRET_KEY.startsWith('sk_test_') ? payment.testUrl : undefined, amount: amountCentavos / 100 });
    } catch (err) {
      db.prepare("DELETE FROM Sales WHERE sale_id = ? AND payment_status = 'PENDING'").run(saleId);
      throw err;
    }
  } catch (err) {
    return res.status(err.status || (err.code === 'INSUFFICIENT_STOCK' ? 422 : 502)).json({ error: err.message });
  }
});

router.get('/:saleId/status', requireAuth, async (req, res) => {
  const db = getDb();
  const sale = db.prepare('SELECT * FROM Sales WHERE sale_id = ?').get(req.params.saleId);
  const qr = db.prepare('SELECT * FROM QrPayments WHERE sale_id = ?').get(req.params.saleId);
  if (!sale || !qr) return res.status(404).json({ error: 'QR payment not found' });
  if (req.user.role === 'cashier' && sale.cashier_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
  if (sale.payment_status === 'SUCCESS') return res.json({ saleId: sale.sale_id, paymentStatus: 'SUCCESS' });
  if (!qr.intent_id) return res.status(409).json({ error: 'QR payment is still being created' });

  try {
    const intent = await getPaymentIntent(qr.intent_id);
    const status = intent.attributes.status;
    if (intent.id !== qr.intent_id || intent.attributes.amount !== qr.amount_centavos || intent.attributes.currency !== 'PHP') {
      return res.status(502).json({ error: 'Payment verification failed' });
    }
    if (status === 'succeeded') {
      const batchIds = db.transaction(() => {
        const current = db.prepare('SELECT payment_status FROM Sales WHERE sale_id = ?').get(sale.sale_id);
        if (current.payment_status === 'SUCCESS') return [];
        const lines = db.prepare('SELECT batch_id, quantity FROM SaleItems WHERE sale_id = ?').all(sale.sale_id);
        for (const line of lines) {
          const updated = db.prepare('UPDATE ProductBatches SET remaining_quantity = remaining_quantity - ? WHERE id = ? AND remaining_quantity >= ?')
            .run(line.quantity, line.batch_id, line.quantity);
          if (!updated.changes) throw Object.assign(new Error('Payment received, but stock changed. Manager review required.'), { status: 409 });
        }
        db.prepare("UPDATE Sales SET payment_status = 'SUCCESS' WHERE sale_id = ?").run(sale.sale_id);
        return [...new Set(lines.map(line => line.batch_id))];
      })();
      for (const batchId of batchIds) {
        const batch = db.prepare('SELECT * FROM ProductBatches WHERE id = ?').get(batchId);
        if (batch) calculateRisk(batch);
      }
      if (batchIds.length) logAudit({ userId: sale.cashier_id, role: 'cashier', action: 'QRPH_PAYMENT_CONFIRMED', affectedTable: 'Sales', affectedId: sale.sale_id });
      return res.json({ saleId: sale.sale_id, paymentStatus: 'SUCCESS' });
    }
    if (['cancelled', 'awaiting_payment_method'].includes(status)) {
      db.prepare("UPDATE Sales SET payment_status = 'REJECTED' WHERE sale_id = ? AND payment_status = 'PENDING'").run(sale.sale_id);
      return res.json({ saleId: sale.sale_id, paymentStatus: 'REJECTED' });
    }
    return res.json({
      saleId: sale.sale_id,
      paymentStatus: 'PENDING',
      amount: qr.amount_centavos / 100,
      qrImage: intent.attributes.next_action?.code?.image_url,
      testUrl: process.env.PAYMONGO_SECRET_KEY?.startsWith('sk_test_')
        ? (intent.attributes.next_action?.code?.test_url || intent.attributes.next_action?.test_url || intent.attributes.test_url)
        : undefined,
    });
  } catch (err) {
    return res.status(err.status || 502).json({ error: err.message || 'Could not verify payment' });
  }
});

module.exports = router;

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('node:crypto');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'freshflow-demo-'));
process.env.DB_PATH = path.join(dir, 'test.db');
process.env.JWT_SECRET = 'demo-test-secret';
process.env.PAYMENT_MODE = 'demo';
delete process.env.PAYMONGO_SECRET_KEY;
delete process.env.PAYMONGO_PUBLIC_KEY;

const { initDatabase, getDb } = require('../src/db/database');
const qrRoutes = require('../src/routes/qrph');
const salesRoutes = require('../src/routes/sales');

test('demo QR remains pending until cashier confirms, then makes one receipt', async () => {
  await initDatabase();
  const db = getDb();
  const cashier = db.prepare("SELECT id FROM Users WHERE role = 'cashier' LIMIT 1").get();
  const product = db.prepare("SELECT id FROM Products WHERE name = 'Whole Milk 1L'").get();
  const batch = db.prepare('SELECT id, remaining_quantity FROM ProductBatches WHERE product_id = ? ORDER BY expiry_date LIMIT 1').get(product.id);
  const saleId = randomUUID();
  const token = jwt.sign({ id: cashier.id, role: 'cashier' }, process.env.JWT_SECRET);
  const app = express();
  app.use(express.json());
  app.use('/api/sales/qrph', qrRoutes);
  app.use('/api/sales', salesRoutes);
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (route, options = {}) => {
    const response = await fetch(`${base}${route}`, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    return { status: response.status, body: await response.json() };
  };
  try {
    const created = await call('/api/sales/qrph', {
      method: 'POST', body: JSON.stringify({ saleId, items: [{ product_id: product.id, quantity: 1 }] }),
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.mode, 'demo');
    assert.equal(created.body.paymentStatus, 'PENDING');
    assert.match(created.body.qrImage, /^data:image\/png;base64,/);
    assert.equal(db.prepare('SELECT remaining_quantity FROM ProductBatches WHERE id = ?').get(batch.id).remaining_quantity, batch.remaining_quantity);
    assert.equal((await call(`/api/sales/${saleId}/receipt`)).status, 409);
    const pending = await call(`/api/sales/qrph/${saleId}/status`);
    assert.equal(pending.body.paymentStatus, 'PENDING');
    assert.equal(pending.body.mode, 'demo');

    const confirmed = await call(`/api/sales/qrph/${saleId}/confirm-demo`, { method: 'POST' });
    assert.equal(confirmed.status, 200);
    assert.equal(confirmed.body.paymentStatus, 'SUCCESS');
    assert.equal((await call(`/api/sales/qrph/${saleId}/confirm-demo`, { method: 'POST' })).body.paymentStatus, 'SUCCESS');
    assert.equal(db.prepare('SELECT remaining_quantity FROM ProductBatches WHERE id = ?').get(batch.id).remaining_quantity, batch.remaining_quantity - 1);
    const receipt = await call(`/api/sales/${saleId}/receipt`);
    assert.equal(receipt.status, 200);
    assert.equal(receipt.body.receipt.paymentMethod, 'Demo E-Wallet');
    assert.equal(receipt.body.receipt.items.length, 1);
  } finally {
    server.close();
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

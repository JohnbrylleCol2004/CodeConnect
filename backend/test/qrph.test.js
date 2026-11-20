'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('node:crypto');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'freshflow-qrph-'));
process.env.DB_PATH = path.join(dir, 'test.db');
process.env.JWT_SECRET = 'test-secret';
process.env.PAYMONGO_SECRET_KEY = 'sk_test_example';
process.env.PAYMONGO_PUBLIC_KEY = 'pk_test_example';

const { initDatabase, getDb } = require('../src/db/database');
const qrphRoutes = require('../src/routes/qrph');
const salesRoutes = require('../src/routes/sales');

test('QR sale waits for PayMongo, then deducts stock once and provides a receipt', async () => {
  await initDatabase();
  const db = getDb();
  const cashier = db.prepare("SELECT id FROM Users WHERE role = 'cashier' LIMIT 1").get();
  const product = db.prepare("SELECT id FROM Products WHERE name = 'Whole Milk 1L'").get();
  const batch = db.prepare('SELECT id, remaining_quantity FROM ProductBatches WHERE product_id = ? ORDER BY expiry_date LIMIT 1').get(product.id);
  const token = jwt.sign({ id: cashier.id, role: 'cashier' }, process.env.JWT_SECRET);
  const saleId = randomUUID();
  let paymongoStatus = 'awaiting_next_action';
  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    if (!String(url).startsWith('https://api.paymongo.com/')) return originalFetch(url, options);
    const endpoint = new URL(url).pathname;
    let data;
    if (endpoint === '/v1/payment_intents' && options.method === 'POST') {
      const body = JSON.parse(options.body);
      assert.equal(body.data.attributes.amount, 249);
      assert.deepEqual(body.data.attributes.payment_method_allowed, ['qrph']);
      data = { id: 'pi_test_1', attributes: { client_key: 'client_test_1' } };
    } else if (endpoint === '/v1/payment_methods') {
      data = { id: 'pm_test_1' };
    } else if (endpoint.endsWith('/attach')) {
      data = { id: 'pi_test_1', attributes: { status: 'awaiting_next_action', next_action: { code: { image_url: 'data:image/png;base64,AAAA', test_url: 'https://dashboard.paymongo.com/test' } } } };
    } else {
      data = { id: 'pi_test_1', attributes: { amount: 249, currency: 'PHP', status: paymongoStatus, next_action: { code: { image_url: 'data:image/png;base64,AAAA' } } } };
    }
    return new Response(JSON.stringify({ data }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const app = express();
  app.use(express.json());
  app.use('/api/sales/qrph', qrphRoutes);
  app.use('/api/sales', salesRoutes);
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (endpoint, options = {}) => {
    const res = await originalFetch(`${base}${endpoint}`, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    return { status: res.status, body: await res.json() };
  };

  try {
    const started = await call('/api/sales/qrph', { method: 'POST', body: JSON.stringify({ saleId, items: [{ product_id: product.id, quantity: 1 }] }) });
    assert.equal(started.status, 201);
    assert.equal(started.body.paymentStatus, 'PENDING');
    assert.match(started.body.qrImage, /^data:image\/png/);
    assert.equal(started.body.testUrl, 'https://dashboard.paymongo.com/test');
    assert.equal(db.prepare('SELECT remaining_quantity FROM ProductBatches WHERE id = ?').get(batch.id).remaining_quantity, batch.remaining_quantity);
    assert.equal((await call(`/api/sales/${saleId}/receipt`)).status, 409);
    assert.equal((await call(`/api/sales/qrph/${saleId}/status`)).body.paymentStatus, 'PENDING');

    paymongoStatus = 'succeeded';
    assert.equal((await call(`/api/sales/qrph/${saleId}/status`)).body.paymentStatus, 'SUCCESS');
    assert.equal((await call(`/api/sales/qrph/${saleId}/status`)).body.paymentStatus, 'SUCCESS');
    assert.equal(db.prepare('SELECT remaining_quantity FROM ProductBatches WHERE id = ?').get(batch.id).remaining_quantity, batch.remaining_quantity - 1);
    const receipt = await call(`/api/sales/${saleId}/receipt`);
    assert.equal(receipt.status, 200);
    assert.equal(receipt.body.receipt.paymentStatus, 'SUCCESS');
    assert.equal(receipt.body.receipt.paymentMethod, 'QR Ph');
    assert.equal(receipt.body.receipt.items.length, 1);

    const cashSaleId = randomUUID();
    const cash = await call('/api/sales/checkout', { method: 'POST', body: JSON.stringify({ saleId: cashSaleId, items: [{ product_id: product.id, quantity: 1 }], paymentMethod: 'CASH' }) });
    assert.equal(cash.status, 201);
    assert.equal(cash.body.sale.payment_status, 'SUCCESS');
    const cashReceipt = await call(`/api/sales/${cashSaleId}/receipt`);
    assert.equal(cashReceipt.status, 200);
    assert.equal(cashReceipt.body.receipt.items.length, 1);
  } finally {
    server.close();
    global.fetch = originalFetch;
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

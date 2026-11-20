'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const jwt = require('jsonwebtoken');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'freshflow-local-barcode-'));
process.env.DB_PATH = path.join(dir, 'test.db');
process.env.JWT_SECRET = 'local-barcode-test';
const { initDatabase, getDb } = require('../src/db/database');
const productsRoutes = require('../src/routes/products');

test('saved barcode lookup returns the exact local product', async () => {
  await initDatabase();
  const db = getDb();
  const manager = db.prepare("SELECT id FROM Users WHERE role = 'manager' LIMIT 1").get();
  const token = jwt.sign({ id: manager.id, role: 'manager' }, process.env.JWT_SECRET);
  const app = express();
  app.use('/api/products', productsRoutes);
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const found = await fetch(`${base}/api/products/barcode/5901234123457`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(found.status, 200);
    const body = await found.json();
    assert.equal(body.product.name, 'Whole Milk 1L');
    assert.equal(body.product.barcode, '5901234123457');
    assert.equal(body.product.category, 'Dairy');

    const missing = await fetch(`${base}/api/products/barcode/9999999999999`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(missing.status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
    db.close();
    if (!dir.startsWith(os.tmpdir() + path.sep)) throw new Error('Unsafe cleanup path');
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

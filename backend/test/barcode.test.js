'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const https = require('node:https');
const express = require('express');
const jwt = require('jsonwebtoken');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'freshflow-barcode-'));
process.env.DB_PATH = path.join(dir, 'test.db');
process.env.JWT_SECRET = 'barcode-test';
delete process.env.FRESHFLOW_DEMO_API_FAILURE;

const { initDatabase, getDb } = require('../src/db/database');
const externalRoutes = require('../src/routes/external');

test('barcode lookup categorizes products and reports missing barcodes', async () => {
  await initDatabase();
  const db = getDb();
  const manager = db.prepare("SELECT id FROM Users WHERE role = 'manager' LIMIT 1").get();
  const token = jwt.sign({ id: manager.id, role: 'manager' }, process.env.JWT_SECRET);
  const originalGet = https.get;
  const originalError = console.error;
  const backendErrors = [];
  console.error = (...args) => backendErrors.push(args.join(' '));
  let registryStatus = 1;
  https.get = (_url, _options, callback) => {
    const request = new EventEmitter();
    request.setTimeout = () => request;
    queueMicrotask(() => {
      const response = new EventEmitter();
      response.statusCode = 200;
      callback(response);
      response.emit('data', JSON.stringify({
        status: registryStatus,
        product: {
          product_name: 'Nutella',
          brands: 'Ferrero',
          categories: 'Cocoa and hazelnuts spreads, Confectionary based spreads',
          categories_tags: ['en:sweet-spreads', 'en:chocolate-spreads'],
        },
      }));
      response.emit('end');
    });
    return request;
  };
  const app = express();
  app.use('/api/external', externalRoutes);
  const server = app.listen(0);
  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/external/barcode/3017620422003`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.found, true);
    assert.equal(body.name, 'Ferrero - Nutella');
    assert.equal(body.category, 'Snacks');

    registryStatus = 0;
    const missing = await fetch(`http://127.0.0.1:${server.address().port}/api/external/barcode/5900005465234456`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(missing.status, 404);
    assert.deepEqual(await missing.json(), {
      error: 'Product not found in Open Food Facts registry',
      barcode: '5900005465234456',
    });
    assert.ok(backendErrors.some(line => line.includes('5900005465234456') && line.includes('not found')));
    const audit = db.prepare("SELECT result, error_info FROM AuditLogs WHERE action = 'EXTERNAL_BARCODE_LOOKUP' AND affected_id = ? ORDER BY id DESC LIMIT 1").get('5900005465234456');
    assert.equal(audit.result, 'FAILURE');
    assert.match(audit.error_info, /not found/);
  } finally {
    await new Promise(resolve => server.close(resolve));
    https.get = originalGet;
    console.error = originalError;
    db.close();
    if (!dir.startsWith(os.tmpdir() + path.sep)) throw new Error('Unsafe cleanup path');
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

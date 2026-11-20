'use strict';

const path   = require('path');
const fs     = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

// ── Path resolution ─────────────────────────────────────────────────────────
const DB_PATH   = path.resolve(process.env.DB_PATH || './freshflow.db');
const SCHEMA_SQL = path.join(__dirname, 'schema.sql');

// ── Singleton ────────────────────────────────────────────────────────────────
let _db = null;

function getDb() {
  if (!_db) {
    _db = new Database(DB_PATH, { verbose: process.env.NODE_ENV === 'development' ? undefined : undefined });
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
  }
  return _db;
}

// ── Schema initialisation ────────────────────────────────────────────────────
function initSchema() {
  const db  = getDb();
  const sql = fs.readFileSync(SCHEMA_SQL, 'utf8');
  db.exec(sql);
  console.log('[DB] Schema initialised');
}

// ── Seed demo data ───────────────────────────────────────────────────────────
async function seedData() {
  const db = getDb();

  const userCount = db.prepare('SELECT COUNT(*) AS cnt FROM Users').get().cnt;
  if (userCount > 0) {
    console.log('[DB] Seed data already present – skipping');
    return;
  }

  console.log('[DB] Seeding demo data …');

  // ── Users ────────────────────────────────────────────────────────────────
  const managerHash  = await bcrypt.hash('manager123', 10);
  const cashierHash  = await bcrypt.hash('cashier123', 10);

  const insertUser = db.prepare(
    'INSERT INTO Users (username, password_hash, role) VALUES (?, ?, ?)'
  );

  const managerRow = insertUser.run('admin',    managerHash,  'manager');
  const cashierRow = insertUser.run('cashier1', cashierHash,  'cashier');

  const managerId  = managerRow.lastInsertRowid;
  const cashierId  = cashierRow.lastInsertRowid;

  // ── Products ──────────────────────────────────────────────────────────────
  const insertProduct = db.prepare(
    'INSERT INTO Products (name, category, unit_price, barcode) VALUES (?, ?, ?, ?)'
  );

  const p1 = insertProduct.run('Whole Milk 1L',      'Dairy',    2.49, '5901234123457');
  const p2 = insertProduct.run('White Bread Loaf',   'Bakery',   1.99, '5901234123458');
  const p3 = insertProduct.run('Greek Yoghurt 500g', 'Dairy',    3.29, '5901234123459');
  const p4 = insertProduct.run('Orange Juice 1L',    'Beverages',2.79, '5901234123460');
  const p5 = insertProduct.run('Cheddar Cheese 250g','Dairy',    4.49, '5901234123461');

  // ── Batches at various expiry dates ──────────────────────────────────────
  // Helper: ISO date string N days from today
  function daysFromNow(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  }

  const insertBatch = db.prepare(`
    INSERT INTO ProductBatches
      (product_id, batch_number, quantity, remaining_quantity, expiry_date, cost_price)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Product 1 – Whole Milk: one batch almost expired (2 days), one fresh (40 days)
  const b1a = insertBatch.run(p1.lastInsertRowid, 'MILK-001', 50, 12, daysFromNow(2),  1.20);
  const b1b = insertBatch.run(p1.lastInsertRowid, 'MILK-002', 80, 80, daysFromNow(40), 1.20);

  // Product 2 – White Bread: one batch expiring in 5 days (HIGH), one in 15 days (MEDIUM)
  const b2a = insertBatch.run(p2.lastInsertRowid, 'BRED-001', 30, 18, daysFromNow(5),  0.80);
  const b2b = insertBatch.run(p2.lastInsertRowid, 'BRED-002', 40, 40, daysFromNow(15), 0.80);

  // Product 3 – Greek Yoghurt: one batch already expired (-1 day), one in 20 days
  const b3a = insertBatch.run(p3.lastInsertRowid, 'YOGR-001', 20, 7,  daysFromNow(-1), 1.80);
  const b3b = insertBatch.run(p3.lastInsertRowid, 'YOGR-002', 35, 35, daysFromNow(20), 1.80);

  // Product 4 – Orange Juice: single batch, 10 days (MEDIUM)
  const b4a = insertBatch.run(p4.lastInsertRowid, 'ORJC-001', 60, 44, daysFromNow(10), 1.40);

  // Product 5 – Cheddar Cheese: single batch, 90 days (LOW)
  const b5a = insertBatch.run(p5.lastInsertRowid, 'CHDD-001', 100,100, daysFromNow(90), 2.90);

  // ── A handful of historic sale items (to give sales_rate meaningful data) ─
  const { v4: uuidv4 } = require('uuid');

  const insertSale = db.prepare(`
    INSERT INTO Sales (sale_id, cashier_id, total_amount, payment_status, created_at)
    VALUES (?, ?, ?, 'SUCCESS', ?)
  `);
  const insertSaleItem = db.prepare(`
    INSERT INTO SaleItems (sale_id, product_id, batch_id, quantity, unit_price, subtotal)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Create 10 historical sales over past 30 days
  for (let i = 1; i <= 10; i++) {
    const sid = uuidv4();
    const daysAgo = Math.floor(Math.random() * 29) + 1;
    const saleDate = new Date();
    saleDate.setDate(saleDate.getDate() - daysAgo);
    const saleAt = saleDate.toISOString();

    const milkQty  = Math.floor(Math.random() * 3) + 1;
    const breadQty = Math.floor(Math.random() * 2) + 1;
    const total    = milkQty * 2.49 + breadQty * 1.99;

    insertSale.run(sid, cashierId, total, saleAt);
    insertSaleItem.run(sid, p1.lastInsertRowid, b1b.lastInsertRowid, milkQty,  2.49, milkQty  * 2.49);
    insertSaleItem.run(sid, p2.lastInsertRowid, b2b.lastInsertRowid, breadQty, 1.99, breadQty * 1.99);
  }

  console.log('[DB] Seed complete – users: admin/manager123 | cashier1/cashier123');
}

// ── Bootstrap ────────────────────────────────────────────────────────────────
async function initDatabase() {
  initSchema();
  await seedData();
  return getDb();
}

module.exports = { getDb, initDatabase };

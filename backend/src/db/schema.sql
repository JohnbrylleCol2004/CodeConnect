-- ============================================================
--  FreshFlow POS – Database Schema
-- ============================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- Users
CREATE TABLE IF NOT EXISTS Users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  username     TEXT    NOT NULL UNIQUE,
  password_hash TEXT   NOT NULL,
  role         TEXT    NOT NULL CHECK(role IN ('cashier','manager')),
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Products
CREATE TABLE IF NOT EXISTS Products (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  category   TEXT    NOT NULL,
  unit_price REAL    NOT NULL CHECK(unit_price >= 0),
  barcode    TEXT    UNIQUE,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- ProductBatches
CREATE TABLE IF NOT EXISTS ProductBatches (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id         INTEGER NOT NULL REFERENCES Products(id) ON DELETE CASCADE,
  batch_number       TEXT    NOT NULL,
  quantity           INTEGER NOT NULL CHECK(quantity >= 0),
  remaining_quantity INTEGER NOT NULL CHECK(remaining_quantity >= 0),
  expiry_date        TEXT    NOT NULL,
  cost_price         REAL    NOT NULL CHECK(cost_price >= 0),
  created_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(product_id, batch_number)
);

-- Sales
CREATE TABLE IF NOT EXISTS Sales (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id        TEXT    NOT NULL UNIQUE,
  cashier_id     INTEGER NOT NULL REFERENCES Users(id),
  total_amount   REAL    NOT NULL CHECK(total_amount >= 0),
  payment_status TEXT    NOT NULL DEFAULT 'PENDING' CHECK(payment_status IN ('PENDING','SUCCESS','REJECTED')),
  created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- SaleItems
CREATE TABLE IF NOT EXISTS SaleItems (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id    TEXT    NOT NULL REFERENCES Sales(sale_id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES Products(id),
  batch_id   INTEGER NOT NULL REFERENCES ProductBatches(id),
  quantity   INTEGER NOT NULL CHECK(quantity > 0),
  unit_price REAL    NOT NULL CHECK(unit_price >= 0),
  subtotal   REAL    NOT NULL CHECK(subtotal >= 0)
);

-- One PayMongo QR Ph intent per pending sale. SaleItems are recorded before
-- payment, while stock is deducted only after PayMongo confirms success.
CREATE TABLE IF NOT EXISTS QrPayments (
  sale_id       TEXT PRIMARY KEY REFERENCES Sales(sale_id) ON DELETE CASCADE,
  intent_id     TEXT UNIQUE,
  amount_centavos INTEGER NOT NULL CHECK(amount_centavos >= 100),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- ExpiryRisks
CREATE TABLE IF NOT EXISTS ExpiryRisks (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id        INTEGER NOT NULL REFERENCES Products(id) ON DELETE CASCADE,
  batch_id          INTEGER NOT NULL REFERENCES ProductBatches(id) ON DELETE CASCADE,
  risk_level        TEXT    NOT NULL CHECK(risk_level IN ('LOW','MEDIUM','HIGH','EXPIRED')),
  days_before_expiry INTEGER NOT NULL,
  remaining_quantity INTEGER NOT NULL,
  sales_rate        REAL    NOT NULL DEFAULT 0,
  calculated_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(batch_id)
);

-- Alerts
CREATE TABLE IF NOT EXISTS Alerts (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id         INTEGER NOT NULL REFERENCES Products(id) ON DELETE CASCADE,
  batch_id           INTEGER NOT NULL REFERENCES ProductBatches(id) ON DELETE CASCADE,
  risk_level         TEXT    NOT NULL CHECK(risk_level IN ('LOW','MEDIUM','HIGH','EXPIRED')),
  recommended_action TEXT    NOT NULL,
  status             TEXT    NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED','RESOLVED')),
  created_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- ManagerActions
CREATE TABLE IF NOT EXISTS ManagerActions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_id          INTEGER NOT NULL REFERENCES Alerts(id),
  manager_id        INTEGER NOT NULL REFERENCES Users(id),
  product_id        INTEGER NOT NULL REFERENCES Products(id),
  batch_id          INTEGER NOT NULL REFERENCES ProductBatches(id),
  quantity_affected INTEGER NOT NULL CHECK(quantity_affected >= 0),
  action_taken      TEXT    NOT NULL,
  reason            TEXT,
  result            TEXT,
  created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- WasteHistory
CREATE TABLE IF NOT EXISTS WasteHistory (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id       INTEGER NOT NULL REFERENCES Products(id) ON DELETE CASCADE,
  batch_id         INTEGER NOT NULL REFERENCES ProductBatches(id) ON DELETE CASCADE,
  waste_status     TEXT    NOT NULL CHECK(waste_status IN ('NOT_WASTED','DISCOUNTED','REMOVED','WASTED')),
  quantity         INTEGER NOT NULL CHECK(quantity >= 0),
  notes            TEXT,
  manager_action_id INTEGER REFERENCES ManagerActions(id),
  created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- AuditLogs
CREATE TABLE IF NOT EXISTS AuditLogs (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id        INTEGER REFERENCES Users(id),
  role           TEXT,
  action         TEXT    NOT NULL,
  affected_table TEXT,
  affected_id    TEXT,
  result         TEXT    NOT NULL DEFAULT 'SUCCESS',
  error_info     TEXT,
  created_at     TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_batches_product      ON ProductBatches(product_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry        ON ProductBatches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_saleitems_sale        ON SaleItems(sale_id);
CREATE INDEX IF NOT EXISTS idx_saleitems_product     ON SaleItems(product_id);
CREATE INDEX IF NOT EXISTS idx_expiryrisk_batch      ON ExpiryRisks(batch_id);
CREATE INDEX IF NOT EXISTS idx_alerts_product        ON Alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status         ON Alerts(status);
CREATE INDEX IF NOT EXISTS idx_waste_product         ON WasteHistory(product_id);
CREATE INDEX IF NOT EXISTS idx_audit_user            ON AuditLogs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created         ON AuditLogs(created_at);

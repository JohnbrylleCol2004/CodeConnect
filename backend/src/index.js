'use strict';

// ── Environment ────────────────────────────────────────────────────────────
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const { initDatabase }      = require('./db/database');
const { recalculateAllRisks } = require('./services/expiryService');

// Routes
const authRoutes    = require('./routes/auth');
const productRoutes = require('./routes/products');
const batchRoutes   = require('./routes/batches');
const salesRoutes   = require('./routes/sales');
const expiryRoutes  = require('./routes/expiry');
const alertRoutes   = require('./routes/alerts');
const reportRoutes  = require('./routes/reports');
const auditRoutes   = require('./routes/audit');
const externalRoutes = require('./routes/external');

const PORT = parseInt(process.env.PORT || '5000', 10);

// ── Express app ────────────────────────────────────────────────────────────
const app = express();

// ── Middleware ────────────────────────────────────────────────────────────
app.use(cors({
  origin: true, // Allow all origins in local dev (localhost:5173, localhost:3000, etc.)
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// ── Health check (unauthenticated) ────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/products',    productRoutes);
app.use('/api/batches',     batchRoutes);
app.use('/api/sales',       salesRoutes);
app.use('/api/expiry',      expiryRoutes);
app.use('/api/alerts',      alertRoutes);
app.use('/api/reports',     reportRoutes);
app.use('/api/audit-logs',  auditRoutes);
app.use('/api/external',    externalRoutes);

// ── 404 handler ───────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[Express] Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// ── Bootstrap ─────────────────────────────────────────────────────────────
async function start() {
  try {
    // 1. Initialise DB and seed data
    await initDatabase();

    // 2. Calculate all expiry risks on startup
    recalculateAllRisks();

    // 3. Schedule periodic recalculation every 60 minutes
    setInterval(() => {
      recalculateAllRisks();
    }, 60 * 60 * 1000);

    // 4. Start HTTP server
    app.listen(PORT, () => {
      console.log(`[Server] FreshFlow POS API running on http://localhost:${PORT}`);
      console.log(`[Server] NODE_ENV=${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('[Server] Fatal startup error:', err);
    process.exit(1);
  }
}

start();

module.exports = app; // exported for testing

'use strict';

const { getDb } = require('../db/database');

// ── Risk classification thresholds ───────────────────────────────────────────
const RISK = {
  EXPIRED: 0,
  HIGH:    7,
  MEDIUM:  30,
  // > 30 → LOW
};

/**
 * Classify a batch by days_before_expiry.
 * @param {number} daysRemaining  Negative = already expired.
 * @returns {'EXPIRED'|'HIGH'|'MEDIUM'|'LOW'}
 */
function classifyRisk(daysRemaining) {
  if (daysRemaining <= 0)             return 'EXPIRED';
  if (daysRemaining <= RISK.HIGH)     return 'HIGH';
  if (daysRemaining <= RISK.MEDIUM)   return 'MEDIUM';
  return 'LOW';
}

/**
 * Calculate days remaining until expiry_date (from today).
 * @param {string} expiryDate  YYYY-MM-DD
 * @returns {number}
 */
function daysUntilExpiry(expiryDate) {
  const today  = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
}

/**
 * Calculate average units sold per day for a product over the last 30 days.
 * @param {number} productId
 * @returns {number}
 */
function getSalesRate(productId) {
  const db = getDb();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const cutoffStr = cutoff.toISOString();

  const row = db.prepare(`
    SELECT COALESCE(SUM(si.quantity), 0) AS total_sold
    FROM SaleItems si
    JOIN Sales s ON s.sale_id = si.sale_id
    WHERE si.product_id = ?
      AND s.payment_status = 'SUCCESS'
      AND s.created_at >= ?
  `).get(productId, cutoffStr);

  return (row.total_sold || 0) / 30;
}

/**
 * Build a human-readable recommended action for an alert.
 */
function recommendedAction(riskLevel, daysRemaining, remainingQty, salesRate) {
  const daysToSell = salesRate > 0 ? Math.ceil(remainingQty / salesRate) : Infinity;

  switch (riskLevel) {
    case 'EXPIRED':
      return `Remove ${remainingQty} unit(s) immediately — batch has expired.`;
    case 'HIGH':
      if (daysToSell > daysRemaining) {
        return `Apply discount to sell ${remainingQty} unit(s) within ${daysRemaining} day(s) or remove.`;
      }
      return `Monitor closely — ${remainingQty} unit(s) expiring in ${daysRemaining} day(s).`;
    case 'MEDIUM':
      return `Consider promotion — ${remainingQty} unit(s) expiring in ${daysRemaining} day(s).`;
    default:
      return `No immediate action needed — ${daysRemaining} days remaining.`;
  }
}

/**
 * Recalculate ExpiryRisk for a single batch and upsert the record.
 * Also creates/updates an Alert if risk level is MEDIUM, HIGH, or EXPIRED.
 */
function calculateRisk(batch) {
  const db = getDb();
  const days      = daysUntilExpiry(batch.expiry_date);
  const level     = classifyRisk(days);
  const salesRate = getSalesRate(batch.product_id);
  const action    = recommendedAction(level, days, batch.remaining_quantity, salesRate);

  // Upsert ExpiryRisks (unique on batch_id)
  db.prepare(`
    INSERT INTO ExpiryRisks
      (product_id, batch_id, risk_level, days_before_expiry, remaining_quantity, sales_rate, calculated_at)
    VALUES (?, ?, ?, ?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    ON CONFLICT(batch_id) DO UPDATE SET
      risk_level         = excluded.risk_level,
      days_before_expiry = excluded.days_before_expiry,
      remaining_quantity = excluded.remaining_quantity,
      sales_rate         = excluded.sales_rate,
      calculated_at      = excluded.calculated_at
  `).run(batch.product_id, batch.id, level, days, batch.remaining_quantity, salesRate);

  // Create alert for MEDIUM / HIGH / EXPIRED batches with stock remaining
  if (['MEDIUM', 'HIGH', 'EXPIRED'].includes(level) && batch.remaining_quantity > 0) {
    // Only create a new PENDING alert if one does not already exist for this batch
    const existing = db.prepare(`
      SELECT id FROM Alerts
      WHERE batch_id = ? AND status = 'PENDING'
      LIMIT 1
    `).get(batch.id);

    if (!existing) {
      db.prepare(`
        INSERT INTO Alerts (product_id, batch_id, risk_level, recommended_action, status)
        VALUES (?, ?, ?, ?, 'PENDING')
      `).run(batch.product_id, batch.id, level, action);
    } else {
      // Update the alert's risk level and action if it escalated
      db.prepare(`
        UPDATE Alerts SET risk_level = ?, recommended_action = ?
        WHERE id = ? AND status = 'PENDING'
      `).run(level, action, existing.id);
    }
  }

  return { riskLevel: level, daysRemaining: days, salesRate };
}

/**
 * Recalculate risks for ALL active batches (called on startup and every 60 min).
 */
function recalculateAllRisks() {
  const db = getDb();
  console.log('[ExpiryService] Recalculating all expiry risks …');

  const batches = db.prepare(`
    SELECT * FROM ProductBatches WHERE remaining_quantity > 0
  `).all();

  for (const batch of batches) {
    try {
      calculateRisk(batch);
    } catch (err) {
      console.error(`[ExpiryService] Error calculating risk for batch ${batch.id}:`, err.message);
    }
  }

  console.log(`[ExpiryService] Done — processed ${batches.length} batch(es)`);
}

/**
 * FEFO: select the batch with the earliest expiry date that still has stock.
 * Returns sorted array of eligible batches for a product.
 *
 * @param {number} productId
 * @param {number} quantityNeeded
 * @returns {Array<{batch, allocate}>} Allocations in FEFO order
 */
function getFEFOAllocations(productId, quantityNeeded) {
  const db = getDb();

  // Get all batches with remaining stock, ordered by expiry ASC (FEFO)
  const batches = db.prepare(`
    SELECT * FROM ProductBatches
    WHERE product_id = ? AND remaining_quantity > 0
    ORDER BY expiry_date ASC, id ASC
  `).all(productId);

  const allocations = [];
  let remaining = quantityNeeded;

  for (const batch of batches) {
    if (remaining <= 0) break;
    const allocate = Math.min(batch.remaining_quantity, remaining);
    allocations.push({ batch, allocate });
    remaining -= allocate;
  }

  if (remaining > 0) {
    throw Object.assign(new Error(`Insufficient stock for product ${productId}. Need ${quantityNeeded}, short by ${remaining}`), { code: 'INSUFFICIENT_STOCK' });
  }

  return allocations;
}

module.exports = {
  classifyRisk,
  daysUntilExpiry,
  getSalesRate,
  calculateRisk,
  recalculateAllRisks,
  getFEFOAllocations,
};

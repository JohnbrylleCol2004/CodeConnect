'use strict';

const express = require('express');
const { getDb }          = require('../db/database');
const { requireManager } = require('../middleware/auth');
const { validate }       = require('../middleware/validate');
const { calculateRisk }  = require('../services/expiryService');
const { logAudit }       = require('../services/auditService');

const router = express.Router();

const VALID_ACTIONS      = ['APPROVE', 'REJECT'];
const VALID_WASTE_STATUS = ['NOT_WASTED', 'DISCOUNTED', 'REMOVED', 'WASTED'];

// ── GET /api/alerts ──────────────────────────────────────────────────────────
router.get('/', requireManager, (req, res) => {
  try {
    const db = getDb();
    const { status, risk_level, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query  = `
      SELECT a.*,
             p.name AS product_name, p.category, p.unit_price,
             pb.batch_number, pb.expiry_date, pb.remaining_quantity
      FROM Alerts a
      JOIN Products p  ON p.id  = a.product_id
      JOIN ProductBatches pb ON pb.id = a.batch_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND a.status = ?';
      params.push(status.toUpperCase());
    }
    if (risk_level) {
      query += ' AND a.risk_level = ?';
      params.push(risk_level.toUpperCase());
    }

    query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), offset);

    const alerts = db.prepare(query).all(...params);
    const total  = db.prepare('SELECT COUNT(*) AS cnt FROM Alerts').get().cnt;

    return res.json({ alerts, total, page: parseInt(page, 10), limit: parseInt(limit, 10) });
  } catch (err) {
    console.error('[Alerts] GET / error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/alerts/:id/action ──────────────────────────────────────────────
router.post('/:id/action',
  requireManager,
  validate(['action', 'waste_status', 'quantity_affected']),
  (req, res) => {
    const alertId = parseInt(req.params.id, 10);
    if (isNaN(alertId)) {
      return res.status(400).json({ error: 'Invalid alert id' });
    }

    const { action, waste_status, quantity_affected, reason = '' } = req.body;

    if (!VALID_ACTIONS.includes(action.toUpperCase())) {
      return res.status(400).json({ error: `action must be one of: ${VALID_ACTIONS.join(', ')}` });
    }
    if (!VALID_WASTE_STATUS.includes(waste_status.toUpperCase())) {
      return res.status(400).json({ error: `waste_status must be one of: ${VALID_WASTE_STATUS.join(', ')}` });
    }

    const qty = parseInt(quantity_affected, 10);
    if (isNaN(qty) || qty < 0) {
      return res.status(400).json({ error: 'quantity_affected must be a non-negative integer' });
    }

    try {
      const db = getDb();

      const alert = db.prepare('SELECT * FROM Alerts WHERE id = ?').get(alertId);
      if (!alert) {
        return res.status(404).json({ error: 'Alert not found' });
      }
      if (alert.status !== 'PENDING') {
        return res.status(409).json({ error: `Alert already in status: ${alert.status}` });
      }

      const batch = db.prepare('SELECT * FROM ProductBatches WHERE id = ?').get(alert.batch_id);
      if (!batch) {
        return res.status(404).json({ error: 'Associated batch not found' });
      }

      if (qty > batch.remaining_quantity) {
        return res.status(422).json({ error: 'quantity_affected exceeds remaining_quantity' });
      }

      const upperAction     = action.toUpperCase();
      const upperWaste      = waste_status.toUpperCase();
      const newAlertStatus  = upperAction === 'APPROVE' ? 'APPROVED' : 'REJECTED';

      // ── Transactional update ────────────────────────────────────────────
      const managerActionId = db.transaction(() => {
        // 1. Update alert status
        db.prepare(`UPDATE Alerts SET status = ? WHERE id = ?`).run(newAlertStatus, alertId);

        // 2. Create ManagerAction record
        const actionResult = db.prepare(`
          INSERT INTO ManagerActions
            (alert_id, manager_id, product_id, batch_id, quantity_affected, action_taken, reason, result)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          alertId, req.user.id, alert.product_id, alert.batch_id,
          qty, upperAction, reason, newAlertStatus
        );

        const maId = actionResult.lastInsertRowid;

        // 3. Record waste history
        db.prepare(`
          INSERT INTO WasteHistory (product_id, batch_id, waste_status, quantity, notes, manager_action_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(alert.product_id, alert.batch_id, upperWaste, qty, reason || null, maId);

        // 4. If APPROVED and removing/wasting stock, deduct from batch
        if (upperAction === 'APPROVE' && ['REMOVED', 'WASTED', 'DISCOUNTED'].includes(upperWaste) && qty > 0) {
          db.prepare(`
            UPDATE ProductBatches SET remaining_quantity = remaining_quantity - ? WHERE id = ?
          `).run(qty, alert.batch_id);

          // Mark alert as RESOLVED after stock adjustment
          db.prepare(`UPDATE Alerts SET status = 'RESOLVED' WHERE id = ?`).run(alertId);
        }

        return maId;
      })();

      // 5. Recalculate risk for the batch
      const updatedBatch = db.prepare('SELECT * FROM ProductBatches WHERE id = ?').get(alert.batch_id);
      if (updatedBatch) {
        calculateRisk(updatedBatch);
      }

      logAudit({
        userId: req.user.id, role: req.user.role,
        action: `ALERT_${upperAction}`,
        affectedTable: 'Alerts', affectedId: alertId
      });

      const updatedAlert = db.prepare('SELECT * FROM Alerts WHERE id = ?').get(alertId);
      const managerAction = db.prepare('SELECT * FROM ManagerActions WHERE id = ?').get(managerActionId);
      const wasteRecord   = db.prepare('SELECT * FROM WasteHistory WHERE manager_action_id = ?').get(managerActionId);

      return res.json({ alert: updatedAlert, managerAction, wasteRecord });
    } catch (err) {
      console.error('[Alerts] POST /:id/action error:', err);
      logAudit({
        userId: req.user.id, role: req.user.role,
        action: 'ALERT_ACTION', affectedTable: 'Alerts', affectedId: alertId,
        result: 'FAILURE', errorInfo: err.message
      });
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

module.exports = router;

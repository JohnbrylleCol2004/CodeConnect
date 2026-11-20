'use strict';

const { getDb } = require('../db/database');

/**
 * Log an audit event to AuditLogs table.
 *
 * @param {object} params
 * @param {number|null}  params.userId        User performing the action
 * @param {string|null}  params.role          Role of the user
 * @param {string}       params.action        Description (e.g. 'LOGIN', 'CHECKOUT')
 * @param {string|null}  params.affectedTable Table being affected
 * @param {string|null}  params.affectedId    Id of the affected record
 * @param {string}       params.result        'SUCCESS' | 'FAILURE'
 * @param {string|null}  params.errorInfo     Error details if result === 'FAILURE'
 */
function logAudit({ userId = null, role = null, action, affectedTable = null, affectedId = null, result = 'SUCCESS', errorInfo = null }) {
  try {
    const db = getDb();
    db.prepare(`
      INSERT INTO AuditLogs (user_id, role, action, affected_table, affected_id, result, error_info)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      role,
      action,
      affectedTable,
      affectedId !== null ? String(affectedId) : null,
      result,
      errorInfo
    );
  } catch (err) {
    // Audit logging failure should never crash the main flow
    console.error('[AuditService] Failed to write audit log:', err.message);
  }
}

module.exports = { logAudit };

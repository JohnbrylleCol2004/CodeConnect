'use strict';

const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { getDb }    = require('../db/database');
const { validate } = require('../middleware/validate');
const { logAudit } = require('../services/auditService');

const router     = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// ── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', validate(['username', 'password']), async (req, res) => {
  const { username, password } = req.body;

  try {
    const db   = getDb();
    const user = db.prepare('SELECT * FROM Users WHERE username = ?').get(username);

    if (!user) {
      logAudit({ action: 'LOGIN', result: 'FAILURE', errorInfo: `Unknown user: ${username}` });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      logAudit({ userId: user.id, role: user.role, action: 'LOGIN', result: 'FAILURE', errorInfo: 'Wrong password' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    logAudit({ userId: user.id, role: user.role, action: 'LOGIN', affectedTable: 'Users', affectedId: user.id });

    return res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (err) {
    console.error('[Auth] login error:', err);
    logAudit({ action: 'LOGIN', result: 'FAILURE', errorInfo: err.message });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ── POST /api/auth/logout ────────────────────────────────────────────────────
// JWT is stateless; logout is client-side. We log the event and return 200.
router.post('/logout', (req, res) => {
  // Optionally decode token to log who logged out (best-effort, no hard failure)
  try {
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token   = authHeader.slice(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      logAudit({ userId: decoded.id, role: decoded.role, action: 'LOGOUT', affectedTable: 'Users', affectedId: decoded.id });
    }
  } catch (_) { /* ignore */ }

  return res.json({ message: 'Logged out successfully' });
});

module.exports = router;

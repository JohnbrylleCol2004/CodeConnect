'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// ── Verify JWT and attach user to req ────────────────────────────────────────
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, username, role }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ── Restrict to manager role ─────────────────────────────────────────────────
function requireManager(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Manager access required' });
    }
    next();
  });
}

module.exports = { requireAuth, requireManager };

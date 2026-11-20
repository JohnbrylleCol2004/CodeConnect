'use strict';

/**
 * Validates that required fields are present and non-empty on req.body.
 * Returns 400 with the first missing field name if validation fails.
 *
 * Usage:
 *   router.post('/foo', validate(['field1','field2']), handler)
 */
function validate(requiredFields) {
  return (req, res, next) => {
    for (const field of requiredFields) {
      const val = req.body[field];
      if (val === undefined || val === null || val === '') {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }
    next();
  };
}

/**
 * Validates query parameters.
 */
function validateQuery(requiredParams) {
  return (req, res, next) => {
    for (const param of requiredParams) {
      if (!req.query[param]) {
        return res.status(400).json({ error: `Missing required query parameter: ${param}` });
      }
    }
    next();
  };
}

/**
 * Sanitises a string to prevent basic injection.
 */
function sanitiseString(str) {
  if (typeof str !== 'string') return str;
  return str.trim().slice(0, 500);
}

/**
 * Validates an integer field within an optional range.
 */
function validateInt(value, min = 0, max = Infinity) {
  const n = parseInt(value, 10);
  if (isNaN(n)) return false;
  if (n < min || n > max) return false;
  return true;
}

/**
 * Validates a positive number.
 */
function validatePositiveNumber(value) {
  const n = parseFloat(value);
  return !isNaN(n) && n > 0;
}

/**
 * Validates an ISO date string (YYYY-MM-DD).
 */
function validateDate(value) {
  if (typeof value !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
}

module.exports = { validate, validateQuery, sanitiseString, validateInt, validatePositiveNumber, validateDate };

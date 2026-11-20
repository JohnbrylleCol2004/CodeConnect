'use strict';

/**
 * Retry a function with exponential backoff.
 *
 * @param {Function} fn          Async (or sync) function to attempt. Must throw on failure.
 * @param {object}   opts
 * @param {number}   opts.maxAttempts  Maximum attempts (default 3)
 * @param {number[]} opts.delays       Delay in ms between attempts (default [2000, 4000, 8000])
 * @returns {Promise<*>}         Resolves with fn's return value or rejects after all attempts fail.
 */
async function withRetry(fn, opts = {}) {
  const maxAttempts = opts.maxAttempts || 3;
  const delays      = opts.delays || [2000, 4000, 8000];

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      console.warn(`[Retry] Attempt ${attempt}/${maxAttempts} failed: ${err.message}`);

      if (attempt < maxAttempts) {
        const delay = delays[attempt - 1] || delays[delays.length - 1];
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { withRetry, sleep };

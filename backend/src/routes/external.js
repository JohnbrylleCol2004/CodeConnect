'use strict';

const express = require('express');
const https = require('https');
const { requireAuth } = require('../middleware/auth');
const { logAudit } = require('../services/auditService');

const router = express.Router();

/**
 * Helper to normalize categories from Open Food Facts into standard retail convenience store categories
 */
function normalizeCategory(rawCategory = '', tags = []) {
  const combined = (rawCategory + ' ' + (tags || []).join(' ')).toLowerCase();

  if (/milk|cheese|dairy|yogurt|yoghurt|butter|cream|lacto/.test(combined)) return 'Dairy';
  if (/bread|bakery|loaf|biscuit|pastry|cake|cookie|flour|toast/.test(combined)) return 'Bakery';
  if (/\b(?:beverages?|drinks?|sodas?|colas?|juices?|teas?|coffees?|waters?|energy)\b/.test(combined)) return 'Beverages';
  if (/snack|chip|crisp|chocolate|candy|sweet|popcorn|cracker/.test(combined)) return 'Snacks';
  if (/noodle|canned|soup|pasta|sauce|rice|grain|cereal|oil|spice/.test(combined)) return 'Pantry';
  if (/meat|poultry|chicken|pork|beef|fish|seafood/.test(combined)) return 'Meat & Seafood';
  if (/soap|shampoo|personal|hygiene|care|tissue/.test(combined)) return 'Personal Care';

  // Fallback to first human-readable category if available
  if (rawCategory && rawCategory.trim()) {
    const first = rawCategory.split(',')[0].trim();
    // remove language prefix like "en:" or "pt:"
    return first.replace(/^[a-z]{2}:/i, '').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return 'General Merchandise';
}

/**
 * ── GET /api/external/barcode/:barcode ─────────────────────────────────────────
 * External integration with Open Food Facts API (https://world.openfoodfacts.org)
 * Fetches real-world product metadata by barcode
 */
router.get('/barcode/:barcode', requireAuth, async (req, res) => {
  const { barcode } = req.params;

  if (!barcode || !/^\d{5,18}$/.test(barcode.trim())) {
    return res.status(400).json({ error: 'Valid numeric barcode is required (5 to 18 digits)' });
  }

  const cleanBarcode = barcode.trim();
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanBarcode)}.json`;

  try {
    const data = await new Promise((resolve, reject) => {
      const request = https.get(
        url,
        {
          headers: {
            'User-Agent': 'FreshFlowPOS - SIA2 Academic Project - FEU Tech',
            Accept: 'application/json',
          },
          timeout: 6000,
        },
        (response) => {
          if (response.statusCode === 404) {
            return resolve(null);
          }
          let buffer = '';
          response.on('data', (chunk) => (buffer += chunk));
          response.on('end', () => {
            try {
              const parsed = JSON.parse(buffer);
              resolve(parsed);
            } catch (err) {
              reject(new Error('Failed to parse external API response'));
            }
          });
        }
      );

      request.on('error', reject);
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Open Food Facts API connection timed out (6s)'));
      });
    });

    if (!data || data.status !== 1 || !data.product) {
      console.error(`[External API] Barcode ${cleanBarcode} not found in Open Food Facts registry`);
      logAudit({
        userId: req.user.id,
        role: req.user.role,
        action: 'EXTERNAL_BARCODE_LOOKUP',
        affectedTable: 'OpenFoodFacts',
        affectedId: cleanBarcode,
        result: 'FAILURE',
        errorInfo: 'Barcode not found in registry',
      });

      return res.status(404).json({
        error: 'Product not found in Open Food Facts registry',
        barcode: cleanBarcode,
      });
    }

    const prod = data.product;
    const name = prod.product_name || prod.product_name_en || prod.generic_name || '';
    const brand = prod.brands ? prod.brands.split(',')[0].trim() : '';
    const category = normalizeCategory(prod.categories, prod.categories_tags);
    const quantity = prod.quantity ? ` (${prod.quantity})` : '';

    const fullName = brand && !name.toLowerCase().includes(brand.toLowerCase())
      ? `${brand} - ${name}${quantity}`
      : `${name}${quantity}`;

    const resultPayload = {
      found: true,
      barcode: cleanBarcode,
      name: fullName.trim() || 'Imported Product',
      brand: brand || null,
      category,
      rawCategories: prod.categories || '',
      imageUrl: prod.image_front_small_url || prod.image_front_url || null,
      ingredients: prod.ingredients_text_en || prod.ingredients_text || null,
      source: 'Open Food Facts API (https://world.openfoodfacts.org)',
    };

    logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'EXTERNAL_BARCODE_LOOKUP',
      affectedTable: 'OpenFoodFacts',
      affectedId: cleanBarcode,
      result: 'SUCCESS',
      errorInfo: `Resolved: ${resultPayload.name} (${resultPayload.category})`,
    });

    return res.json(resultPayload);
  } catch (err) {
    console.error('[External API] Open Food Facts error:', err.message);

    logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'EXTERNAL_BARCODE_LOOKUP',
      affectedTable: 'OpenFoodFacts',
      affectedId: cleanBarcode,
      result: 'FAILURE',
      errorInfo: err.message,
    });

    return res.status(502).json({
      error: 'External Open Food Facts API is temporarily unavailable',
      detail: err.message,
    });
  }
});

module.exports = router;

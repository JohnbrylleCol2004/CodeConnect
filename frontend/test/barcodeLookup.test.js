import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveBarcodeLookup } from '../src/utils/barcodeLookup.js';

const ok = (data) => ({ status: 'fulfilled', value: { data } });
const fail = (status, message) => ({ status: 'rejected', reason: { response: { status, data: { error: message } } } });

test('saved barcode remains available when Open Food Facts has no result', () => {
  const result = resolveBarcodeLookup(ok({ product: { name: 'White Bread', category: 'Bakery', unit_price: 3 } }), ok({ found: false }));
  assert.equal(result.local.status, 'found');
  assert.equal(result.external.status, 'missing');
  assert.equal(result.fill.name, 'White Bread');
  assert.equal(result.fill.unit_price, 3);
});

test('external mismatch does not overwrite the saved product', () => {
  const result = resolveBarcodeLookup(ok({ product: { name: 'Whole Milk 1L', category: 'Dairy', unit_price: 4 } }), ok({ found: true, name: 'Sauce chiltepin', category: 'Condiments' }));
  assert.equal(result.mismatch, true);
  assert.equal(result.fill.name, 'Whole Milk 1L');
});

test('external product fills an unknown local barcode', () => {
  const result = resolveBarcodeLookup(fail(404, 'Not found'), ok({ found: true, name: 'Nutella', category: 'Pantry' }));
  assert.equal(result.local.status, 'missing');
  assert.equal(result.fill.name, 'Nutella');
  assert.equal(result.fill.unit_price, undefined);
});

test('external failure is shown independently of saved product', () => {
  const result = resolveBarcodeLookup(ok({ product: { name: 'Whole Milk 1L' } }), fail(502, 'Registry unavailable'));
  assert.equal(result.local.status, 'found');
  assert.equal(result.external.status, 'error');
  assert.equal(result.external.message, 'Registry unavailable');
});

test('a registry 404 is shown as not found, not a connection error', () => {
  const result = resolveBarcodeLookup(ok({ product: { name: 'White Bread' } }), fail(404, 'Product not found in Open Food Facts registry'));
  assert.equal(result.local.status, 'found');
  assert.equal(result.external.status, 'missing');
  assert.equal(result.external.message, 'Product not found in Open Food Facts registry');
});

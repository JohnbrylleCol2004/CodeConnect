'use strict';

const API = 'https://api.paymongo.com/v1';

async function request(path, method, key, attributes) {
  if (!key) throw Object.assign(new Error('PayMongo API keys are not configured'), { status: 503 });
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: attributes ? JSON.stringify({ data: { attributes } }) : undefined,
    signal: AbortSignal.timeout(10000),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = body.errors?.[0]?.detail || body.errors?.[0]?.code || 'Payment service unavailable';
    throw Object.assign(new Error(detail), { status: response.status >= 500 ? 502 : 400 });
  }
  if (!body.data) throw Object.assign(new Error('Invalid PayMongo response'), { status: 502 });
  return body.data;
}

async function createQrPayment(saleId, amountCentavos) {
  const intent = await request('/payment_intents', 'POST', process.env.PAYMONGO_SECRET_KEY, {
    amount: amountCentavos,
    currency: 'PHP',
    payment_method_allowed: ['qrph'],
    description: `FreshFlow sale ${saleId}`,
  });
  const method = await request('/payment_methods', 'POST', process.env.PAYMONGO_PUBLIC_KEY, {
    type: 'qrph',
  });
  const attached = await request(`/payment_intents/${encodeURIComponent(intent.id)}/attach`, 'POST', process.env.PAYMONGO_PUBLIC_KEY, {
    payment_method: method.id,
    client_key: intent.attributes.client_key,
  });
  return {
    intentId: intent.id,
    status: attached.attributes.status,
    imageUrl: attached.attributes.next_action?.code?.image_url,
    testUrl: attached.attributes.next_action?.code?.test_url || attached.attributes.next_action?.test_url || attached.attributes.test_url,
  };
}

async function getPaymentIntent(intentId) {
  return request(`/payment_intents/${encodeURIComponent(intentId)}`, 'GET', process.env.PAYMONGO_SECRET_KEY);
}

module.exports = { createQrPayment, getPaymentIntent };

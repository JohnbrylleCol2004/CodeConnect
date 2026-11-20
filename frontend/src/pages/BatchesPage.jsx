import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

function getRiskBadge(riskLevel) {
  const level = (riskLevel || '').toUpperCase();
  const styles = {
    LOW: { bg: '#d4edda', color: '#155724', border: '#c3e6cb' },
    MEDIUM: { bg: '#fff3cd', color: '#856404', border: '#ffeeba' },
    HIGH: { bg: '#ffe8d6', color: '#b94a00', border: '#ffd1b3' },
    EXPIRED: { bg: '#f8d7da', color: '#721c24', border: '#f5c6cb' },
  };
  const conf = styles[level] || { bg: '#e2e3e5', color: '#383d41', border: '#d6d8db' };
  return (
    <span
      style={{
        padding: '3px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 'bold',
        backgroundColor: conf.bg,
        color: conf.color,
        border: `1px solid ${conf.border}`,
      }}
    >
      {level || 'N/A'}
    </span>
  );
}

export default function BatchesPage() {
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form state
  const [form, setForm] = useState({
    product_id: '',
    batch_number: '',
    quantity: '',
    expiry_date: '',
    cost_price: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState(null);
  const [filterProductId, setFilterProductId] = useState('');

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = filterProductId ? `/batches?product_id=${filterProductId}` : '/batches';
      const res = await api.get(url);
      setBatches(res.data?.batches || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load batches');
    } finally {
      setLoading(false);
    }
  }, [filterProductId]);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products?limit=100');
      setProducts(res.data?.products || []);
    } catch (err) {
      console.error('Failed to load products:', err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormMsg(null);

    try {
      await api.post('/batches', {
        product_id: parseInt(form.product_id, 10),
        batch_number: form.batch_number.trim(),
        quantity: parseInt(form.quantity, 10),
        expiry_date: form.expiry_date,
        cost_price: parseFloat(form.cost_price),
      });

      setFormMsg({ type: 'success', text: 'Batch added successfully!' });
      setForm({
        product_id: '',
        batch_number: '',
        quantity: '',
        expiry_date: '',
        cost_price: '',
      });
      fetchBatches();
    } catch (err) {
      setFormMsg({
        type: 'error',
        text: err.response?.data?.error || 'Failed to add batch.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a5c38' }}>Product Batches (FEFO Tracking)</h1>
        <button
          onClick={fetchBatches}
          style={{
            padding: '8px 16px',
            backgroundColor: '#1a5c38',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Add Batch Card */}
      <div
        style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          marginBottom: '24px',
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#333' }}>
          ➕ Register New Batch
        </h2>

        {formMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '6px',
              marginBottom: '16px',
              backgroundColor: formMsg.type === 'success' ? '#d4edda' : '#f8d7da',
              color: formMsg.type === 'success' ? '#155724' : '#721c24',
              border: `1px solid ${formMsg.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
            }}
          >
            {formMsg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
              Product *
            </label>
            <select
              name="product_id"
              value={form.product_id}
              onChange={handleInputChange}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                boxSizing: 'border-box',
              }}
            >
              <option value="">Select a Product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.category})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
              Batch Number *
            </label>
            <input
              type="text"
              name="batch_number"
              placeholder="e.g. BATCH-2026-001"
              value={form.batch_number}
              onChange={handleInputChange}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
              Quantity (Units) *
            </label>
            <input
              type="number"
              name="quantity"
              min="1"
              placeholder="e.g. 50"
              value={form.quantity}
              onChange={handleInputChange}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
              Expiry Date (YYYY-MM-DD) *
            </label>
            <input
              type="date"
              name="expiry_date"
              value={form.expiry_date}
              onChange={handleInputChange}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', marginBottom: '6px' }}>
              Cost Price (₱) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              name="cost_price"
              placeholder="e.g. 25.50"
              value={form.cost_price}
              onChange={handleInputChange}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #ccc',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: '#1a5c38',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? 'Saving...' : 'Add Batch'}
            </button>
          </div>
        </form>
      </div>

      {/* Batches List Card */}
      <div
        style={{
          background: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#333' }}>
            Batches Inventory ({batches.length})
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: '#666' }}>Filter by Product:</span>
            <select
              value={filterProductId}
              onChange={(e) => setFilterProductId(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
            >
              <option value="">All Products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div style={{ padding: '10px', background: '#f8d7da', color: '#721c24', borderRadius: '6px', marginBottom: '14px' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#666' }}>Loading batches...</div>
        ) : batches.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#888' }}>No batches found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #eee', background: '#f9f9f9', color: '#555' }}>
                  <th style={{ padding: '10px 12px' }}>Product</th>
                  <th style={{ padding: '10px 12px' }}>Category</th>
                  <th style={{ padding: '10px 12px' }}>Batch Number</th>
                  <th style={{ padding: '10px 12px' }}>Initial Qty</th>
                  <th style={{ padding: '10px 12px' }}>Remaining</th>
                  <th style={{ padding: '10px 12px' }}>Expiry Date</th>
                  <th style={{ padding: '10px 12px' }}>Days Left</th>
                  <th style={{ padding: '10px 12px' }}>Risk Level</th>
                  <th style={{ padding: '10px 12px' }}>Cost (₱)</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px 12px', fontWeight: '500' }}>{b.product_name}</td>
                    <td style={{ padding: '10px 12px', color: '#666' }}>{b.category}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{b.batch_number}</td>
                    <td style={{ padding: '10px 12px' }}>{b.quantity}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 'bold', color: b.remaining_quantity === 0 ? '#999' : '#1a5c38' }}>
                      {b.remaining_quantity}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{b.expiry_date}</td>
                    <td style={{ padding: '10px 12px' }}>
                      {b.days_before_expiry !== null && b.days_before_expiry !== undefined ? (
                        <span style={{ fontWeight: b.days_before_expiry <= 7 ? 'bold' : 'normal', color: b.days_before_expiry <= 0 ? '#dc3545' : b.days_before_expiry <= 7 ? '#d9534f' : '#333' }}>
                          {b.days_before_expiry <= 0 ? 'EXPIRED' : `${b.days_before_expiry}d`}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>{getRiskBadge(b.risk_level)}</td>
                    <td style={{ padding: '10px 12px' }}>₱{parseFloat(b.cost_price || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

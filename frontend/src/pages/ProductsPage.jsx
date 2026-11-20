import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const PAGE_SIZE = 10;

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString();
}

function formatPrice(val) {
  if (val === null || val === undefined) return '—';
  return `$${parseFloat(val).toFixed(2)}`;
}

export default function ProductsPage() {
  const navigate = useNavigate();

  // ── Form state ──
  const [form, setForm] = useState({ name: '', category: '', unit_price: '', barcode: '' });
  const [formMsg, setFormMsg] = useState(null); // { type: 'success'|'error', text }
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [lookingUpBarcode, setLookingUpBarcode] = useState(false);
  const [barcodeResult, setBarcodeResult] = useState(null);

  const handleBarcodeLookup = async () => {
    if (!form.barcode || !form.barcode.trim()) {
      setFormMsg({ type: 'error', text: 'Please enter a barcode number first to lookup.' });
      return;
    }
    setLookingUpBarcode(true);
    setBarcodeResult(null);
    setFormMsg(null);
    try {
      const res = await api.get(`/external/barcode/${encodeURIComponent(form.barcode.trim())}`);
      if (res.data && res.data.found) {
        setForm((prev) => ({
          ...prev,
          name: res.data.name || prev.name,
          category: res.data.category || prev.category,
        }));
        setBarcodeResult({
          type: 'success',
          data: res.data,
        });
      } else {
        setBarcodeResult({
          type: 'info',
          message: res.data?.message || 'Barcode not found in Open Food Facts registry. You can enter details manually.',
        });
      }
    } catch (err) {
      setBarcodeResult({
        type: 'error',
        message: err.response?.data?.error || err.response?.data?.detail || 'Failed to query Open Food Facts API.',
      });
    } finally {
      setLookingUpBarcode(false);
    }
  };

  // ── Products state ──
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productsError, setProductsError] = useState(null);
  const [page, setPage] = useState(0);

  // ── Expanded batch rows ──
  const [expandedId, setExpandedId] = useState(null);
  const [batchData, setBatchData] = useState({});   // { [productId]: { loading, data, error } }

  // ── Fetch products ──
  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    setProductsError(null);
    try {
      const res = await api.get('/products');
      setProducts(Array.isArray(res.data) ? res.data : res.data?.products ?? []);
      setPage(0);
    } catch (err) {
      setProductsError('Failed to load products.');
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // ── Pagination slice ──
  const pageCount = Math.ceil(products.length / PAGE_SIZE);
  const pagedProducts = products.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // ── Add Product ──
  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setFormMsg(null);
    try {
      await api.post('/products', {
        name: form.name,
        category: form.category,
        unit_price: parseFloat(form.unit_price),
        barcode: form.barcode,
      });
      setFormMsg({ type: 'success', text: 'Product added successfully!' });
      setForm({ name: '', category: '', unit_price: '', barcode: '' });
      setBarcodeResult(null);
      fetchProducts();
    } catch (err) {
      const msg = err.response?.data?.message ?? err.response?.data?.error ?? 'Failed to add product.';
      setFormMsg({ type: 'error', text: msg });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Toggle batch expansion ──
  async function handleViewBatches(product) {
    if (expandedId === product.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(product.id);
    if (batchData[product.id]) return; // already fetched
    setBatchData((prev) => ({ ...prev, [product.id]: { loading: true, data: null, error: null } }));
    try {
      const res = await api.get(`/products/${product.id}/batches`);
      const data = Array.isArray(res.data) ? res.data : res.data?.batches ?? [];
      setBatchData((prev) => ({ ...prev, [product.id]: { loading: false, data, error: null } }));
    } catch {
      setBatchData((prev) => ({
        ...prev,
        [product.id]: { loading: false, data: null, error: 'Failed to load batches.' },
      }));
    }
  }

  // ── Styles ──
  const s = {
    page: { padding: '32px', maxWidth: '1200px', margin: '0 auto' },
    heading: { fontSize: '24px', fontWeight: '700', color: '#1a5c38', marginBottom: '24px' },

    section: { marginBottom: '32px' },
    sectionHeader: {
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: '16px',
    },
    sectionTitle: { fontSize: '18px', fontWeight: '600', color: '#333' },
    toggleBtn: {
      padding: '6px 14px', background: '#f0f0f0', border: '1px solid #ccc',
      borderRadius: '4px', cursor: 'pointer', fontSize: '13px',
    },

    formBox: {
      background: '#fff', borderRadius: '8px', padding: '24px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.07)', border: '1px solid #e0e0e0',
    },
    formRow: { display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' },
    fieldGroup: { display: 'flex', flexDirection: 'column', flex: '1 1 180px', gap: '4px' },
    label: { fontSize: '13px', fontWeight: '600', color: '#555' },
    input: {
      padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px',
      fontSize: '14px', outline: 'none',
    },
    submitBtn: {
      padding: '10px 24px', background: '#1a5c38', color: '#fff', border: 'none',
      borderRadius: '6px', fontWeight: '600', fontSize: '14px', cursor: 'pointer',
    },
    msg: (type) => ({
      padding: '10px 16px', borderRadius: '6px', fontSize: '14px', marginTop: '12px',
      background: type === 'success' ? '#e8f5e9' : '#fce4ec',
      color: type === 'success' ? '#2e7d32' : '#c62828',
      border: `1px solid ${type === 'success' ? '#a5d6a7' : '#ef9a9a'}`,
    }),

    tableWrap: {
      background: '#fff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
      border: '1px solid #e0e0e0', overflow: 'hidden',
    },
    tableToolbar: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '12px 16px', borderBottom: '1px solid #e0e0e0',
    },
    refreshBtn: {
      padding: '7px 16px', background: '#1a5c38', color: '#fff', border: 'none',
      borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
    },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '14px' },
    th: {
      background: '#1a5c38', color: '#fff', padding: '10px 14px',
      textAlign: 'left', fontWeight: '600', whiteSpace: 'nowrap',
    },
    td: (idx) => ({
      padding: '10px 14px', borderBottom: '1px solid #f0f0f0',
      background: idx % 2 === 0 ? '#fff' : '#f9f9f9',
      verticalAlign: 'top',
    }),
    viewBtn: {
      padding: '5px 12px', background: '#e3f2fd', color: '#1565c0',
      border: '1px solid #90caf9', borderRadius: '4px', cursor: 'pointer',
      fontSize: '13px', fontWeight: '600',
    },
    batchRow: { background: '#f4faf6' },
    batchCell: { padding: '12px 24px', borderBottom: '1px solid #e0e0e0' },
    batchTable: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
    batchTh: {
      background: '#2e7d32', color: '#fff', padding: '7px 12px',
      textAlign: 'left', fontWeight: '600',
    },
    batchTd: (idx) => ({
      padding: '7px 12px', borderBottom: '1px solid #e0e0e0',
      background: idx % 2 === 0 ? '#fff' : '#f1f8e9',
    }),
    pagination: {
      display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
      gap: '12px', padding: '12px 16px', borderTop: '1px solid #e0e0e0',
    },
    pageBtn: (disabled) => ({
      padding: '6px 14px', border: '1px solid #ccc', borderRadius: '4px',
      cursor: disabled ? 'not-allowed' : 'pointer', background: disabled ? '#f5f5f5' : '#fff',
      color: disabled ? '#aaa' : '#333', fontSize: '13px',
    }),
  };

  return (
    <div style={s.page}>
      <h1 style={s.heading}>Products Management</h1>

      {/* ── Add Product Form ── */}
      <div style={s.section}>
        <div style={s.sectionHeader}>
          <span style={s.sectionTitle}>Add New Product</span>
          <button style={s.toggleBtn} onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Hide Form ▲' : 'Show Form ▼'}
          </button>
        </div>
        {showForm && (
          <div style={s.formBox}>
            <form onSubmit={handleSubmit}>
              <div style={s.formRow}>
                <div style={s.fieldGroup}>
                  <label style={s.label}>Name *</label>
                  <input
                    style={s.input} type="text" required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Product name"
                  />
                </div>
                <div style={s.fieldGroup}>
                  <label style={s.label}>Category</label>
                  <input
                    style={s.input} type="text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="e.g. Beverages"
                  />
                </div>
                <div style={s.fieldGroup}>
                  <label style={s.label}>Unit Price *</label>
                  <input
                    style={s.input} type="number" required min="0" step="0.01"
                    value={form.unit_price}
                    onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div style={s.fieldGroup}>
                  <label style={s.label}>Barcode (EAN / UPC)</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      style={{ ...s.input, flex: 1 }} type="text"
                      value={form.barcode}
                      onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                      placeholder="e.g. 5449000000996"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleBarcodeLookup(); } }}
                    />
                    <button
                      type="button"
                      onClick={handleBarcodeLookup}
                      disabled={lookingUpBarcode}
                      title="Fetch product name and category from Open Food Facts API"
                      style={{
                        padding: '8px 12px',
                        background: '#e8f5e9',
                        color: '#1b5e20',
                        border: '1px solid #a5d6a7',
                        borderRadius: '4px',
                        cursor: lookingUpBarcode ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {lookingUpBarcode ? '🔍 Looking up…' : '🌐 Auto-Fill (API)'}
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Open Food Facts API Result Preview Banner ── */}
              {barcodeResult && barcodeResult.type === 'success' && (
                <div style={{
                  background: '#f1f8e9',
                  border: '1px solid #c5e1a5',
                  borderRadius: '6px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}>
                  {barcodeResult.data.imageUrl && (
                    <img
                      src={barcodeResult.data.imageUrl}
                      alt="Thumbnail"
                      style={{ width: '48px', height: '48px', objectFit: 'contain', background: '#fff', borderRadius: '4px', border: '1px solid #ddd' }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#2e7d32' }}>
                      🌐 Verified by Open Food Facts Global API
                    </div>
                    <div style={{ fontSize: '13px', color: '#333', marginTop: '2px' }}>
                      <strong>{barcodeResult.data.name}</strong> &bull; Category: <em>{barcodeResult.data.category}</em>
                      {barcodeResult.data.brand && <span> &bull; Brand: {barcodeResult.data.brand}</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: '#689f38', fontWeight: 'bold', background: '#dcedc8', padding: '3px 8px', borderRadius: '10px' }}>
                    EXTERNAL API
                  </span>
                </div>
              )}

              {barcodeResult && barcodeResult.type !== 'success' && (
                <div style={{
                  background: barcodeResult.type === 'error' ? '#ffebee' : '#fff9c4',
                  border: `1px solid ${barcodeResult.type === 'error' ? '#ffcdd2' : '#fff59d'}`,
                  color: barcodeResult.type === 'error' ? '#c62828' : '#827717',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  marginBottom: '16px',
                  fontSize: '13px',
                }}>
                  {barcodeResult.type === 'error' ? '⚠️ ' : 'ℹ️ '} {barcodeResult.message}
                </div>
              )}

              <button style={s.submitBtn} type="submit" disabled={submitting}>
                {submitting ? 'Adding…' : '+ Add Product'}
              </button>
              {formMsg && <div style={s.msg(formMsg.type)}>{formMsg.text}</div>}
            </form>
          </div>
        )}
      </div>

      {/* ── Products Table ── */}
      <div style={s.section}>
        <div style={s.sectionHeader}>
          <span style={s.sectionTitle}>All Products ({products.length})</span>
        </div>
        <div style={s.tableWrap}>
          <div style={s.tableToolbar}>
            <span style={{ fontSize: '13px', color: '#666' }}>
              {loadingProducts ? 'Loading…' : productsError ? productsError : `${products.length} product(s) found`}
            </span>
            <button style={s.refreshBtn} onClick={fetchProducts} disabled={loadingProducts}>
              🔄 Refresh
            </button>
          </div>
          <table style={s.table}>
            <thead>
              <tr>
                {['ID', 'Name', 'Category', 'Unit Price', 'Barcode', 'Created At', 'Actions'].map((h) => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagedProducts.length === 0 && !loadingProducts && (
                <tr>
                  <td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#888' }}>
                    No products found.
                  </td>
                </tr>
              )}
              {pagedProducts.map((product, idx) => {
                const isExpanded = expandedId === product.id;
                const bd = batchData[product.id];
                return (
                  <React.Fragment key={product.id}>
                    <tr>
                      <td style={s.td(idx)}>{product.id}</td>
                      <td style={s.td(idx)}><strong>{product.name}</strong></td>
                      <td style={s.td(idx)}>{product.category ?? '—'}</td>
                      <td style={s.td(idx)}>{formatPrice(product.unit_price)}</td>
                      <td style={s.td(idx)}>{product.barcode ?? '—'}</td>
                      <td style={s.td(idx)}>{formatDate(product.created_at)}</td>
                      <td style={s.td(idx)}>
                        <button
                          style={s.viewBtn}
                          onClick={() => handleViewBatches(product)}
                        >
                          {isExpanded ? 'Hide Batches ▲' : 'View Batches ▼'}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr style={s.batchRow}>
                        <td colSpan={7} style={s.batchCell}>
                          {bd?.loading && <div style={{ color: '#666', fontSize: '13px' }}>Loading batches…</div>}
                          {bd?.error && <div style={{ color: '#c62828', fontSize: '13px' }}>{bd.error}</div>}
                          {bd?.data && (
                            bd.data.length === 0 ? (
                              <div style={{ color: '#888', fontSize: '13px' }}>No batches for this product.</div>
                            ) : (
                              <table style={s.batchTable}>
                                <thead>
                                  <tr>
                                    {['Batch #', 'Qty', 'Remaining', 'Expiry Date', 'Cost Price'].map((h) => (
                                      <th key={h} style={s.batchTh}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {bd.data.map((batch, bi) => (
                                    <tr key={batch.id ?? bi}>
                                      <td style={s.batchTd(bi)}>{batch.batch_number}</td>
                                      <td style={s.batchTd(bi)}>{batch.quantity}</td>
                                      <td style={s.batchTd(bi)}>{batch.remaining_quantity}</td>
                                      <td style={s.batchTd(bi)}>{formatDate(batch.expiry_date)}</td>
                                      <td style={s.batchTd(bi)}>{formatPrice(batch.cost_price)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
          {pageCount > 1 && (
            <div style={s.pagination}>
              <span style={{ fontSize: '13px', color: '#666' }}>
                Page {page + 1} of {pageCount}
              </span>
              <button style={s.pageBtn(page === 0)} onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
                ← Previous
              </button>
              <button style={s.pageBtn(page >= pageCount - 1)} onClick={() => setPage((p) => p + 1)} disabled={page >= pageCount - 1}>
                Next →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

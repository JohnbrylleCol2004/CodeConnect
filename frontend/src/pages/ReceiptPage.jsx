import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

function StatusBadge({ status }) {
  const configs = {
    SUCCESS:  { bg: '#d4edda', color: '#155724', border: '#c3e6cb', label: '✅ SUCCESS' },
    PENDING:  { bg: '#fff3cd', color: '#856404', border: '#ffeeba', label: '⏳ PENDING' },
    REJECTED: { bg: '#f8d7da', color: '#721c24', border: '#f5c6cb', label: '❌ REJECTED' },
  };
  const cfg = configs[status?.toUpperCase()] || configs.PENDING;
  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 14px',
      borderRadius: '20px',
      background: cfg.bg,
      color: cfg.color,
      border: `1px solid ${cfg.border}`,
      fontWeight: '700',
      fontSize: '13px',
    }}>
      {cfg.label}
    </span>
  );
}

export default function ReceiptPage() {
  const { saleId } = useParams();
  const navigate = useNavigate();

  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!saleId) return;
    setLoading(true);
    api.get(`/sales/${saleId}/receipt`)
      .then((res) => {
        setReceipt(res.data);
        setError('');
      })
      .catch((err) => {
        setError(
          err.response?.data?.message ||
          err.response?.data?.error ||
          'Could not load receipt.'
        );
      })
      .finally(() => setLoading(false));
  }, [saleId]);

  // ── Styles ──────────────────────────────────────────────────────────────────
  const s = {
    page: {
      minHeight: '100vh',
      background: '#f4f6f9',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '40px 24px',
    },
    card: {
      background: '#fff',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.10)',
      padding: '36px 40px',
      width: '100%',
      maxWidth: '580px',
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    },
    header: {
      textAlign: 'center',
      marginBottom: '24px',
      paddingBottom: '20px',
      borderBottom: '2px dashed #e0e0e0',
    },
    storeName: {
      fontSize: '26px',
      fontWeight: '800',
      color: '#1a5c38',
      letterSpacing: '-0.5px',
    },
    receiptLabel: {
      display: 'inline-block',
      marginTop: '6px',
      padding: '3px 16px',
      background: '#1a5c38',
      color: '#fff',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '700',
      letterSpacing: '2px',
    },
    metaRow: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '13px',
      color: '#555',
      marginBottom: '6px',
    },
    metaLabel: { fontWeight: '600', color: '#333' },
    metaSection: { marginBottom: '20px' },
    divider: { borderTop: '1px solid #eee', margin: '16px 0' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
    th: {
      padding: '8px 10px',
      textAlign: 'left',
      fontWeight: '700',
      color: '#555',
      borderBottom: '2px solid #eee',
      background: '#f9f9f9',
    },
    td: { padding: '9px 10px', borderBottom: '1px solid #f0f0f0', color: '#333' },
    totalSection: {
      marginTop: '16px',
      display: 'flex',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: '16px',
    },
    totalLabel: { fontSize: '16px', fontWeight: '700', color: '#333' },
    totalAmount: { fontSize: '22px', fontWeight: '800', color: '#1a5c38' },
    footer: { marginTop: '28px', textAlign: 'center', paddingTop: '20px', borderTop: '2px dashed #e0e0e0' },
    thankYou: { fontSize: '14px', color: '#888', marginBottom: '16px' },
    backBtn: {
      padding: '10px 28px',
      background: '#1a5c38',
      color: '#fff',
      border: 'none',
      borderRadius: '7px',
      fontSize: '14px',
      fontWeight: '700',
      cursor: 'pointer',
    },
  };

  // ── Loading / Error ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={s.page}>
        <div style={{ ...s.card, textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
          <div style={{ color: '#888' }}>Loading receipt…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={s.page}>
        <div style={{ ...s.card, textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>❌</div>
          <div style={{ color: '#c0392b', fontWeight: '600', marginBottom: '16px' }}>{error}</div>
          <button style={s.backBtn} onClick={() => navigate('/checkout')}>
            ← Back to Checkout
          </button>
        </div>
      </div>
    );
  }

  const items = receipt?.items || receipt?.saleItems || [];
  const total = receipt?.totalAmount ?? receipt?.total_amount ?? 0;
  const paymentStatus = receipt?.paymentStatus || receipt?.payment_status || receipt?.status || 'PENDING';
  const cashier = receipt?.cashier || receipt?.cashierName || receipt?.cashier_name || '—';
  const dateTime = receipt?.createdAt || receipt?.created_at || receipt?.date || '';
  const displayDate = dateTime
    ? new Date(dateTime).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';

  return (
    <div style={s.page}>
      <div style={s.card}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.storeName}>🌿 FreshFlow POS</div>
          <div style={s.receiptLabel}>RECEIPT</div>
        </div>

        {/* Meta info */}
        <div style={s.metaSection}>
          <div style={s.metaRow}>
            <span style={s.metaLabel}>Sale ID</span>
            <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#777' }}>
              {saleId}
            </span>
          </div>
          <div style={s.metaRow}>
            <span style={s.metaLabel}>Date / Time</span>
            <span>{displayDate}</span>
          </div>
          <div style={s.metaRow}>
            <span style={s.metaLabel}>Cashier</span>
            <span>{cashier}</span>
          </div>
          <div style={s.metaRow}>
            <span style={s.metaLabel}>Payment</span>
            <span>
              {receipt?.paymentMethod || receipt?.payment_method || '—'}
            </span>
          </div>
        </div>

        <div style={s.divider} />

        {/* Items table */}
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Product</th>
              <th style={{ ...s.th, textAlign: 'center' }}>Qty</th>
              <th style={{ ...s.th, textAlign: 'right' }}>Unit Price</th>
              <th style={{ ...s.th, textAlign: 'right' }}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const unitPrice = parseFloat(item.unit_price ?? item.unitPrice ?? 0);
              const qty = item.quantity ?? item.qty ?? 1;
              const subtotal = parseFloat(item.subtotal ?? (unitPrice * qty));
              return (
                <tr key={item.product_id || idx}>
                  <td style={s.td}>{item.name || item.productName || item.product_name || '—'}</td>
                  <td style={{ ...s.td, textAlign: 'center' }}>{qty}</td>
                  <td style={{ ...s.td, textAlign: 'right' }}>${unitPrice.toFixed(2)}</td>
                  <td style={{ ...s.td, textAlign: 'right', fontWeight: '600' }}>
                    ${subtotal.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Total */}
        <div style={s.totalSection}>
          <span style={s.totalLabel}>TOTAL</span>
          <span style={s.totalAmount}>${parseFloat(total).toFixed(2)}</span>
        </div>

        <div style={s.divider} />

        {/* Payment status */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
          <StatusBadge status={paymentStatus} />
        </div>

        {/* Footer */}
        <div style={s.footer}>
          <div style={s.thankYou}>Thank you for shopping at FreshFlow!</div>
          <button style={s.backBtn} onClick={() => navigate('/checkout')}>
            ← Back to Checkout
          </button>
        </div>
      </div>
    </div>
  );
}

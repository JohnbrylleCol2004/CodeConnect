import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const RISK_COLORS = {
  LOW: '#d4edda',
  MEDIUM: '#fff3cd',
  HIGH: '#ffe8d6',
  EXPIRED: '#f8d7da',
};

const RISK_TEXT_COLORS = {
  LOW: '#155724',
  MEDIUM: '#856404',
  HIGH: '#b94a00',
  EXPIRED: '#721c24',
};

const STATUS_TABS = ['PENDING', 'APPROVED', 'REJECTED', 'RESOLVED', 'All'];

function RiskBadge({ level }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: '12px',
        background: RISK_COLORS[level] || '#eee',
        color: RISK_TEXT_COLORS[level] || '#333',
        border: `1px solid ${(RISK_TEXT_COLORS[level] || '#aaa')}55`,
        fontWeight: 700,
        fontSize: '12px',
      }}
    >
      {level}
    </span>
  );
}

function PendingAlertCard({ alert, onActionComplete }) {
  const [wasteStatus, setWasteStatus] = useState(
    alert.risk_level === 'EXPIRED' ? 'WASTED' : 'DISCOUNTED'
  );
  const [quantityAffected, setQuantityAffected] = useState(alert.remaining_quantity || 1);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleApprove = async () => {
    if (!reason.trim()) {
      setMessage({ type: 'error', text: 'Reason / note is required to approve this action.' });
      return;
    }
    const qty = parseInt(quantityAffected, 10);
    if (isNaN(qty) || qty < 0) {
      setMessage({ type: 'error', text: 'Valid quantity is required.' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      await api.post(`/alerts/${alert.id}/action`, {
        action: 'APPROVE',
        waste_status: wasteStatus,
        quantity_affected: qty,
        reason: reason.trim(),
      });
      setMessage({ type: 'success', text: 'Alert approved & inventory action recorded in waste history!' });
      setTimeout(() => onActionComplete(alert.id), 800);
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.error || err?.response?.data?.message || 'Failed to approve alert.' });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) {
      setMessage({ type: 'error', text: 'Reason is required to reject this recommendation.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await api.post(`/alerts/${alert.id}/action`, {
        action: 'REJECT',
        waste_status: 'NOT_WASTED',
        quantity_affected: 0,
        reason: reason.trim(),
      });
      setMessage({ type: 'success', text: 'Alert rejected.' });
      setTimeout(() => onActionComplete(alert.id), 800);
    } catch (err) {
      setMessage({ type: 'error', text: err?.response?.data?.error || err?.response?.data?.message || 'Failed to reject alert.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        border: '1px solid #dee2e6',
        borderRadius: '10px',
        padding: '20px',
        marginBottom: '20px',
        background: '#fafafa',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      {/* Alert Header Row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '16px', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#888', fontWeight: 600, marginBottom: '2px' }}>PRODUCT</div>
          <div style={{ fontWeight: 700, color: '#1a5c38', fontSize: '16px' }}>
            {alert.product_name || `Product #${alert.product_id}`}
          </div>
          <div style={{ fontSize: '12px', color: '#666' }}>{alert.category || 'General'}</div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: '#888', fontWeight: 600, marginBottom: '2px' }}>BATCH NUMBER</div>
          <div style={{ fontWeight: 700, color: '#333', fontSize: '14px', fontFamily: 'monospace' }}>
            {alert.batch_number || `Batch #${alert.batch_id}`}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: '#888', fontWeight: 600, marginBottom: '2px' }}>STOCK REMAINING</div>
          <div style={{ fontWeight: 700, color: '#333', fontSize: '16px' }}>
            {alert.remaining_quantity ?? alert.quantity ?? '—'} units
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: '#888', fontWeight: 600, marginBottom: '2px' }}>RISK LEVEL</div>
          <RiskBadge level={alert.risk_level} />
        </div>

        <div style={{ flex: 1, minWidth: '220px' }}>
          <div style={{ fontSize: '11px', color: '#888', fontWeight: 600, marginBottom: '2px' }}>SYSTEM RECOMMENDATION</div>
          <div style={{ fontWeight: 600, color: '#b94a00', fontSize: '14px' }}>
            {alert.recommended_action}
          </div>
        </div>
      </div>

      {/* Action Decision Form */}
      <div
        style={{
          background: '#fff',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #e9ecef',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          alignItems: 'end',
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '4px' }}>
            Inventory Outcome
          </label>
          <select
            value={wasteStatus}
            onChange={(e) => setWasteStatus(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              fontSize: '13px',
              background: '#fff',
              boxSizing: 'border-box',
            }}
          >
            <option value="DISCOUNTED">DISCOUNTED (Apply Promo/Discount)</option>
            <option value="REMOVED">REMOVED (Pull from Shelf)</option>
            <option value="WASTED">WASTED (Dispose / Written Off)</option>
            <option value="NOT_WASTED">NOT_WASTED (Keep at Regular Price)</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '4px' }}>
            Affected Units
          </label>
          <input
            type="number"
            min="0"
            max={alert.remaining_quantity || 9999}
            value={quantityAffected}
            onChange={(e) => setQuantityAffected(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              fontSize: '13px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#555', marginBottom: '4px' }}>
            Manager Note / Reason <span style={{ color: '#dc3545' }}>*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. 30% discount applied to clear shelf before expiry"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '6px',
              fontSize: '13px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleApprove}
            disabled={loading}
            style={{
              flex: 1,
              padding: '9px 16px',
              background: '#1a5c38',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            ✓ Approve Action
          </button>
          <button
            onClick={handleReject}
            disabled={loading}
            style={{
              flex: 1,
              padding: '9px 16px',
              background: '#6c757d',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            ✕ Dismiss
          </button>
        </div>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px 14px',
            borderRadius: '6px',
            background: message.type === 'success' ? '#d4edda' : '#f8d7da',
            color: message.type === 'success' ? '#155724' : '#721c24',
            fontSize: '13px',
            fontWeight: 600,
            border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('PENDING');

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/alerts');
      const list = Array.isArray(res.data) ? res.data : (res.data?.alerts || []);
      setAlerts(list);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load alerts. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const handleActionComplete = (id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const filtered = tab === 'All' ? alerts : alerts.filter((a) => a.status === tab);
  const pendingCount = alerts.filter((a) => a.status === 'PENDING').length;

  return (
    <div style={{ padding: '24px', background: '#fff', minHeight: '100%', borderRadius: '8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a5c38', margin: 0 }}>
            Alerts & Waste Reduction Approvals
          </h1>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: '14px' }}>
            Review system-flagged near-expiry inventory and authorize display prioritization, discounts, or write-offs.
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          style={{
            padding: '8px 18px',
            background: '#1a5c38',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid #dee2e6' }}>
        {STATUS_TABS.map((t) => {
          const count = t === 'All' ? alerts.length : alerts.filter((a) => a.status === t).length;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 18px',
                border: 'none',
                borderBottom: tab === t ? '3px solid #1a5c38' : '3px solid transparent',
                background: 'transparent',
                color: tab === t ? '#1a5c38' : '#666',
                fontWeight: tab === t ? 700 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                marginBottom: '-2px',
                transition: 'all 0.15s',
              }}
            >
              {t} {count > 0 && <span style={{ fontSize: '12px', fontWeight: 700, opacity: 0.8 }}>({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ padding: '12px 16px', background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '6px', color: '#721c24', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Main Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#888', fontSize: '16px' }}>
          Loading alerts...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#888', fontSize: '16px' }}>
          {tab === 'All' ? 'No alerts found.' : `No ${tab} alerts.`}
        </div>
      ) : tab === 'PENDING' ? (
        <div>
          {filtered.map((alert) => (
            <PendingAlertCard key={alert.id} alert={alert} onActionComplete={handleActionComplete} />
          ))}
        </div>
      ) : (
        /* History table for non-PENDING tabs */
        <div style={{ overflowX: 'auto', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#1a5c38', color: '#fff' }}>
                <th style={{ padding: '12px 14px' }}>Product</th>
                <th style={{ padding: '12px 14px' }}>Batch</th>
                <th style={{ padding: '12px 14px' }}>Risk Level</th>
                <th style={{ padding: '12px 14px' }}>Recommendation</th>
                <th style={{ padding: '12px 14px' }}>Status</th>
                <th style={{ padding: '12px 14px' }}>Created At</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((alert, idx) => (
                <tr
                  key={alert.id || idx}
                  style={{
                    background: idx % 2 === 0 ? '#fff' : '#fcfcfc',
                    borderBottom: '1px solid #eee',
                  }}
                >
                  <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                    {alert.product_name || `Product #${alert.product_id}`}
                  </td>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace' }}>
                    {alert.batch_number || `Batch #${alert.batch_id}`}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <RiskBadge level={alert.risk_level} />
                  </td>
                  <td style={{ padding: '12px 14px', color: '#333' }}>{alert.recommended_action}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: 700,
                        background:
                          alert.status === 'APPROVED'
                            ? '#d4edda'
                            : alert.status === 'REJECTED'
                            ? '#f8d7da'
                            : '#cce5ff',
                        color:
                          alert.status === 'APPROVED'
                            ? '#155724'
                            : alert.status === 'REJECTED'
                            ? '#721c24'
                            : '#004085',
                      }}
                    >
                      {alert.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#777', fontSize: '13px' }}>
                    {alert.created_at ? new Date(alert.created_at).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

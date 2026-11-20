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

const FILTER_OPTIONS = ['All', 'LOW', 'MEDIUM', 'HIGH', 'EXPIRED'];

export default function ExpiryRisksPage() {
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('All');

  const fetchRisks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/expiry/risks');
      const list = Array.isArray(res.data) ? res.data : (res.data?.risks || []);
      setRisks(list);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load expiry risks. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      await api.post('/expiry/recalculate');
      await fetchRisks();
    } catch (err) {
      setError('Failed to trigger recalculation.');
    } finally {
      setRecalculating(false);
    }
  };

  useEffect(() => {
    fetchRisks();
  }, [fetchRisks]);

  const filtered = filter === 'All' ? risks : risks.filter((r) => r.risk_level === filter);

  const counts = FILTER_OPTIONS.slice(1).reduce((acc, level) => {
    acc[level] = risks.filter((r) => r.risk_level === level).length;
    return acc;
  }, {});

  return (
    <div style={{ padding: '24px', background: '#fff', minHeight: '100%', borderRadius: '8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1a5c38', margin: 0 }}>Expiry Risks Analysis</h1>
          <p style={{ margin: '4px 0 0', color: '#666', fontSize: '14px' }}>
            Batch shelf-life tracking, FEFO priority calculation, and dynamic risk categorization.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            style={{
              padding: '8px 16px',
              background: '#0d6efd',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: recalculating ? 'not-allowed' : 'pointer',
            }}
          >
            {recalculating ? '⚙️ Recalculating...' : '⚡ Recalculate Now'}
          </button>
          <button
            onClick={fetchRisks}
            style={{
              padding: '8px 16px',
              background: '#1a5c38',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {FILTER_OPTIONS.slice(1).map((level) => (
          <div
            key={level}
            onClick={() => setFilter(level)}
            style={{
              background: RISK_COLORS[level],
              border: `2px solid ${filter === level ? RISK_TEXT_COLORS[level] : 'transparent'}`,
              borderRadius: '8px',
              padding: '12px 20px',
              minWidth: '120px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'transform 0.1s',
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: 700, color: RISK_TEXT_COLORS[level] }}>
              {counts[level] || 0}
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: RISK_TEXT_COLORS[level] }}>
              {level}
            </div>
          </div>
        ))}
        <div
          onClick={() => setFilter('All')}
          style={{
            background: '#f8f9fa',
            border: `2px solid ${filter === 'All' ? '#1a5c38' : '#dee2e6'}`,
            borderRadius: '8px',
            padding: '12px 20px',
            minWidth: '120px',
            textAlign: 'center',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#333' }}>{risks.length}</div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#666' }}>TOTAL ACTIVE</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => setFilter(opt)}
            style={{
              padding: '6px 16px',
              borderRadius: '20px',
              border: '1px solid',
              borderColor: filter === opt ? '#1a5c38' : '#ccc',
              background: filter === opt ? (opt === 'All' ? '#1a5c38' : RISK_COLORS[opt]) : '#fff',
              color: filter === opt ? (opt === 'All' ? '#fff' : RISK_TEXT_COLORS[opt]) : '#555',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {opt}
            {opt !== 'All' && ` (${counts[opt] || 0})`}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            background: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '6px',
            color: '#721c24',
            marginBottom: '16px',
          }}
        >
          {error}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#888', fontSize: '16px' }}>
          Loading expiry risks...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#888', fontSize: '16px' }}>
          {filter === 'All' ? 'No expiry risks recorded.' : `No ${filter} risk batches found.`}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#1a5c38', color: '#fff' }}>
                <th style={{ padding: '12px 14px' }}>Product</th>
                <th style={{ padding: '12px 14px' }}>Category</th>
                <th style={{ padding: '12px 14px' }}>Batch Number</th>
                <th style={{ padding: '12px 14px' }}>Risk Level</th>
                <th style={{ padding: '12px 14px' }}>Expiry Date</th>
                <th style={{ padding: '12px 14px' }}>Days Left</th>
                <th style={{ padding: '12px 14px' }}>Remaining Qty</th>
                <th style={{ padding: '12px 14px' }}>Sales Velocity (u/day)</th>
                <th style={{ padding: '12px 14px' }}>Calculated At</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((risk, idx) => {
                const days = risk.days_before_expiry;
                return (
                  <tr
                    key={risk.id || idx}
                    style={{
                      background: idx % 2 === 0 ? '#fff' : '#fcfcfc',
                      borderBottom: '1px solid #eee',
                    }}
                  >
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>
                      {risk.product_name || `Product #${risk.product_id}`}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#666' }}>{risk.category || '—'}</td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 600 }}>
                      {risk.batch_number || `Batch #${risk.batch_id}`}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          background: RISK_COLORS[risk.risk_level] || '#eee',
                          color: RISK_TEXT_COLORS[risk.risk_level] || '#333',
                          border: `1px solid ${RISK_TEXT_COLORS[risk.risk_level] || '#aaa'}66`,
                          fontWeight: 700,
                          fontSize: '12px',
                        }}
                      >
                        {risk.risk_level}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>{risk.expiry_date || '—'}</td>
                    <td
                      style={{
                        padding: '12px 14px',
                        fontWeight: 700,
                        color: days <= 0 ? '#dc3545' : days <= 7 ? '#d9534f' : '#28a745',
                      }}
                    >
                      {days <= 0 ? `EXPIRED (${days}d)` : `${days} days`}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>{risk.remaining_quantity}</td>
                    <td style={{ padding: '12px 14px', color: '#555' }}>
                      {parseFloat(risk.sales_rate || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#777', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {risk.calculated_at ? new Date(risk.calculated_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
